import { readAsArrayBuffer, readAsText, readAsBase64 } from "./reader";
import { processPDF, CODES as PDF_CODES } from "./pdf";
import { processImages } from "./image";
import type { Assessment, AssessmentDocument, AssessmentPage} from "../import.server/assessInputs";
import { type Document, DocumentState } from "../import/index";
import { writable, type Writable } from "svelte/store";



export const files: Writable<File[]> = writable([]);

export enum TaskState {
    'NEW' = 'NEW',
    'ASSESSING' = 'ASSESSING',
    'ASSESSED' = 'ASSESSED',
}

export interface Task {
    name: string;
    type: 'application/pdf' | 'images';
    data: string | ArrayBuffer | string[];
    state: TaskState;
}


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
                    tasks.push({
                        name: file.name,
                        type: 'application/pdf',
                        data: await readAsArrayBuffer(file),
                        state: TaskState.NEW
                    })                    
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
                name: 'Images',
                type: 'images',
                data: await Promise.all(groupped.images.map(async (file) => {
                    return await readAsBase64(file);          
                })),
                state: TaskState.NEW
            });
        }
        return tasks;
}

export async function processTask(task: Task): Promise<Document[]> {
    switch (task.type) {
        case 'application/pdf':
            return await processPDF(task.data as ArrayBuffer).then((assessment) => {
                return processMultipageAssessmentToDocumnets(assessment, [], task);
            });
        case 'images':
            return await processImages(task.data as string[]).then((assessment) => {
                return processMultipageAssessmentToDocumnets(assessment, [], taks);
            });
        default:
            return Promise.reject('Unsupported task type');
    }
}

/*
export function processFiles(files: File[]): Promise<Document[]> {
    return new Promise(async (resolve, reject) => {
        let documents: Document[] = [];
        

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
                    const pdf = await readAsArrayBuffer(file);
                    let assessment;
                    try {
                        assessment = await processPDF(pdf);
                    } catch (error) {
                        if (error === PDF_CODES.PASSWORD) {
                            // ask for password
                            const password = prompt('Please enter the password');
                            if (password) {
                                try {
                                    assessment = await processPDF(pdf, password);
                                } catch (error) {
                                    if (error === PDF_CODES.PASSWORD) {
                                        throw Error(PDF_CODES.PASSWORD_INCORRECT);
                                    } else {
                                        throw error;
                                    }
                                }
                            } else {
                                throw Error(PDF_CODES.PASSWORD_INCORRECT);
                            }
                        }
                    }

                    documents = processMultipageAssessmentToDocumnets(assessment, documents);
                    
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
            let imageInputs = await Promise.all(groupped.images.map(async (file) => {
                return await readAsBase64(file);          
            }));
            const assessments = await processImages(imageInputs) as Assessment;
            documents = processMultipageAssessmentToDocumnets(assessments, documents);
        }

        resolve(documents);

    });
};
*/


function processMultipageAssessmentToDocumnets(assessment: AssessmentClient, documents: Document[], taks: Task): Document[] {
    assessment.documents.forEach((doc) => {
        
        const pages = doc.pages.map((page, index) => {
            const pageData = assessment.pages.find((p) => p.page === page);
            return {
                page: index,
                language: pageData?.language,
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
        documents.push({
            ...doc,
            state: DocumentState.NEW,
            pages,
            type: taks.type,
            files: taks.data,
        })
    });
    return documents;
}