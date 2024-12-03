import { readAsArrayBuffer, readAsText, readAsBase64 } from "./reader";
import { processPDF, CODES as PDF_CODES } from "./pdf";
import { processImages } from "./image";
import type { Assessment, AssessmentDocument, AssessmentPage} from "../import.server/assessInputs";
import { type Document, DocumentState } from "../import/index";
import type { DocumentNew  } from '$lib/med/documents/types.d';
import { writable, type Writable } from "svelte/store";
import { selectPagesFromPdf, createPdfFromImageBuffers } from '$lib/files/pdf';
import { type Task, TaskState } from "../import/index";
import { toBase64 } from "$lib/arrays";
import { checkPassword } from "./pdf";

export const files: Writable<File[]> = writable([]);



interface AssessmentPagesClient extends AssessmentPage {
    image?: string;
    thumbnail?: string;
}

interface AssessmentClient extends Assessment {
    pages: AssessmentPagesClient[];
}



export async function createTasks(files: File[]): Promise<Task[]> {

        const tasks: Task[] =[];

        // split the files into images and the rest
        const groupped = {
            images: [] as File[],
            rest: [] as File[]
        }

        for (let file of files) {
            if (file.type.startsWith('image')) {
                groupped.images.push(file);
            } else {
                groupped.rest.push(file);
            }
        }


        // process individual files 1 by 1 (not multipage or dealt with inside the processPDF)
        while(groupped.rest.length > 0) {
            const file = groupped.rest[0];
            switch (file.type) {
                case 'application/pdf':
                    const data = await readAsArrayBuffer(file);
                    let password = await checkPassword(data, file.name);
                    if (!(password instanceof Error)) {
                        console.log('Password obtained', password);
                        tasks.push({
                            title: file.name,
                            type: 'application/pdf',
                            icon: 'pdf',
                            data,
                            password,
                            state: TaskState.NEW,
                            files: [file]
                        })                   
                    } else {
                        console.log('Cannot obtain password', file.type);
                    }
                    break;
                default:
                    //reject('Unsupported file type');
                    console.log('Unsupported file type', file.type);
                    break;
            }
            groupped.rest.shift();
        }

                
        // width images we do not if they are just multiple pages for the same document or different documents - lets assess them
        if (groupped.images.length > 0) {
            tasks.push({
                title: 'Images',
                type: 'images',
                icon: groupped.images[0].type.split('/')[1],
                data: await Promise.all(groupped.images.map(async (file) => {
                    return await readAsBase64(file);          
                })),
                state: TaskState.NEW,
                files: groupped.images
            });
        }
        return tasks;
}

export async function processTask(task: Task): Promise<DocumentNew[]> {
    switch (task.type) {
        case 'application/pdf':
            return await processPDF(task.data as ArrayBuffer, task.password).then((assessment) => {
                return processMultipageAssessmentToDocumnets(assessment, [], task);
            }) as DocumentNew[];
        case 'images':
            return await processImages(task.data as string[]).then((assessment) => {
                return processMultipageAssessmentToDocumnets(assessment, [], task);
            }) as DocumentNew[];
        default:
            return Promise.reject('Unsupported task type');
    }
}



async function processMultipageAssessmentToDocumnets(assessment: AssessmentClient, documents: DocumentNew[], task: Task): Promise<DocumentNew[]> {
    await Promise.all(assessment.documents.map(async (doc) => {
        
        const pages = doc.pages.map((page, index) => {
            const pageData = assessment.pages.find((p) => p.page === page);
            return {
                page: index,
                language: doc?.language,
                type: pageData?.type,
                text: pageData?.text,
                image: pageData?.image,
                thumbnail: pageData?.thumbnail
            }
        }) as {
            page: number;
            language: string;
            text: string;
        }[];

        let attachment: {
            thumbnail: string;
            type: string;
            file: string;
        };
        switch (task.type) {
            case 'application/pdf':
                // split orignal pdf into individual document pdf
                const pdf = task.data as ArrayBuffer;
                //console.log('splitting pdf', pages.map((p) => p.page), pdf);

                attachment = {
                    thumbnail: pages[0].thumbnail,
                    type: 'application/pdf',
                    file: await toBase64((await selectPagesFromPdf(pdf, pages.map((p) => p.page+1), task.password)))
                }
/*
                const a = document.createElement('a')
                a.href = URL.createObjectURL(new Blob(
                  [ attachment ],
                  { type: 'application/pdf' }
                ))
                a.download = 'fileName.pdf'
                a.click()*/
                break;
            case 'images':
                // merge images into a single pdf
                const imageBuffers = pages.map((p) => p.image);
                attachment = {
                    thumbnail: pages[0].thumbnail,
                    type: 'application/pdf',
                    file: await toBase64(await createPdfFromImageBuffers(imageBuffers))
                }
                break;
            default:
                throw new Error('Unsupported task type');
        }


        documents.push({
            ...doc,
            state: DocumentState.NEW,
            pages,
            type: task.type,
            files: task.data,
            attachments: [attachment],
            task
        })
    }));
    return documents;
}