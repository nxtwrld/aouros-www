
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
import { error, text } from '@sveltejs/kit';

import { fetchGpt } from '$lib/ai/gpt';
import { type Content, type TokenUsage } from '$lib/ai/types.d';
import { sleep } from "$lib/utils";


const DEBUG = true;

const assessSchemaImage : FunctionDefinition = {
    "name": "extractor",
    "description": `Proceed step by step. 
    Step 1: 
    Your input is a set of images of most probably a medical report or reports. 
    Your task is to extract all test from the image as plain text documents. Each image is page from the document.
    Step 2:
    Assess that all pages are from the same document or multiple documents. I multiple documents are detected, we will mark the invidual documents and the pages they consist of.
    Step 3: if the page contains other data then text, like images, schemas or photos, extract that area and list them here. If the page is a DICOM image, list the image here. If the page is a photo, list the photo here.
    `,
    "parameters": {
        "type": "object",
        "properties": {

            "pages": {
                "type": "array",
                "description": "List of pages in the document. Each page is a separate image. The order of the pages is the initial order of the images.",
                "items": {
                    "type": "object",
                    "properties": {
                        "page": {
                            "type": "integer",
                            "description": "Page number in the document. The first page is 1."
                        },

                        "text": {
                            "type": "string",
                            "description": `
                            Proceed step by step: 
                            1. Asssess the image, identify, headings, footer, tables and paragraphs.
                            2. Extracted all text from the page in markdown format. Try to respect the layout and formatting of the original document.  
                            3. Proofread the text and correct any typing errors or errors created by noise in the original image scan.
                            `
                        },
                        "images": {
                            "type": "array",
                            "description": `
                                Proceed step by step:
                                1. detect any image data besides text on the page.
                                2. Extract the image data and list it here. If the image is a photo, schema or DICOM image, list it here.
                                3. Extract the position and size of the image in the page. The top left corner is 0,0 and our units are percetages of the page size.
                            `,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "enum": [ "dicom" , "photo", "schema" ],
                                        "description": "Type of the image. If it is a schema, photo or DICOM image."
                                    },
                                    "position": {
                                        "type": "object",
                                        "properties": {
                                            "x": {
                                                "type": "integer",
                                                "description": "X coordinate of the image in the page. The top left corner is 0."
                                            },
                                            "y": {
                                                "type": "integer",
                                                "description": "Y coordinate of the image in the page. The top left corner is 0."
                                            },
                                            "width": {
                                                "type": "integer",
                                                "description": "Width of the image in pixels."
                                            },
                                            "height": {
                                                "type": "integer",
                                                "description": "Height of the image in pixels."
                                            }
                                        }
                                    },
                                    "data": {
                                        "type": "string",
                                        "description": "base64 encoded image"
                                    }
                                }
                             
                            }
                        }
                    },
                    "required": [ "page", "text", "language" ]
                }
            },
            "documents": {
                "type": "array",
                "description": "List of documents detected in the pages We want to split the pages into sets, if there are multiple documents detected. If there is only one document, list it here.",    
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Title of the document in the original language of the document."
                        },
                        "date": {
                            "type": "string",
                            "description": "Date of the document. Use the ISO 8601 format."
                        },
                        "language": {
                            "type": "string",
                            "description": "Language of the text. Use the ISO 639-1 code."
                        },
                        "isMedical": {
                            "type": "boolean",
                            "description": "Is it a medical report, lab results or DICOM type image? true/false." 
                        },
                        "pages": {
                            "type": "array",
                            "description": "List of pages in the document. Each page is a separate image. The order of the pages is the initial order of the images.",
                            "items": {
                                "type": "integer",
                                "description": "Page number in the document. The first page is 1."
                            }
                        }
                    },
                    "required": [ "document", "pages" ]
                }

            },

        },
        "required": [ "pages", "documents" ]
    }
}


type Input = {
    images: string[];
    //text?: string;
    //language?: string;
};

export interface Assessment {
    pages: AssessmentPage[]
    documents: AssessmentDocument[]
    tokenUsage: TokenUsage;
}

export interface AssessmentDocument {
    title: string;
    date: string;
    isMedical: boolean;
    pages: number[];
}

export interface AssessmentPage {
    page: number;
    language: string;
    text: string;
    images: {
        type: string;
        position: {
            x: number;
            y: number;
            width: number;
            height: number;
        },
        data: string;
    }[]
}

export default async function assess(input : Input): Promise<Assessment> {

    const tokenUsage : TokenUsage = {
      total: 0
    };

    if (DEBUG) {
        await sleep(500);
        return Promise.resolve(TEST_DATA);
    }

    
    const content = input.images.map((image) => {
        return {
            type: 'image_url',
            image_url: {
                url: image
            }
        }
    }) as Content[];

  //  await sleep(500);
//    return Promise.resolve(TEST_DATA);

    // get basic item info
    let data =  await fetchGpt(content, assessSchemaImage, tokenUsage) as Assessment;
    data.tokenUsage = tokenUsage;

    console.log('All done...', data.tokenUsage.total)
    // return item
    return data;
}



const TEST_DATA = {
    "pages": [
        {
            "page": 1,
            "text": "MEDIENDO s.r.o., Thámova 289/13, 186 00 Praha 8\nTel.: +420 273 139 861\nIČZ: 0848600\n\nPacient: Ing. Veronika ČENKOVÁ, r. 1975\nBydliště: V Třešňovce 224, 190 00 Praha 9\nPojišťovna: 207 - Oborová zdravotní pojišťovna  Číslo pojištěnce: 7559100010\nDatum: 15.08.2024\n\nEndoskopie horní části trávicího traktu\nOdesílající lékař: MUDr. Miluše Vostradovská, Praha 8, Canadian Medical s.r.o. - AFI, IČP: 01354961\nIndikace: Dyspeptický syndrom recidiv. Bolest břicha.\nPřístroje: Gastroskop Pentax MAGiNA EG29-i10c, v.č. E0006120500, Insuflátor CO2 v.č. C000875, Pulzní oxymetr Nellcor PM100N, v.č. MBP1628.072\nAsistence: Hana Kubů\nPremedikace: Lidocain 10% spray\n\nNález:\nPřístroj volně zaveden do jícnu, který ve svém průběhu intaktní. Z-linie v 39cm od řezáků. Kardie nedovírá. \nŽaludek se po insuflaci přiměřeně rozvíjí, řasy autoplastické, jezírko čiré.\nSliznice fundu, těla a antra žaludku klidná. Pylorus okrouhlý, volně prostupný.\nV bulbu a D2 je normální nález.\nVýkon bez komplikací.\n\nZávěr:\nInkompetence kardie, jinak normální nález endoskopický nález v rozsahu jícen - D2.\n\nDoporučení:\nPo výkonu jednu hodinu nepít, nejíst, nekouřit.\nAntirefluxní dieta z režimová opatření, ev. PPI nebo prokinetika.\nPacient poučen o nepití, po vyšetření, odchází v klinicky stabilizovaném stavu.\n\nKrevní tlak/puls/saturace\nTK: 130/98 Puls: 88 Saturace: 97%\n\nMUDr. Tomáš Grega\nDatum: 15.08.2024 8:21:23\nMUDr. Tomáš Grega\n\nMediendo s.r.o.,\nGastroenterologie, oob. 105\nThámová 289/13\n186 00 Praha 8\nTel. 273 139 861",
            "images": []
        },
        {
            "page": 2,
            "text": "Centrum pohybové medicíny\nCentrum pohybové medicíny Pavla Koláře, a.s.\nWalterovo náměstí 329/2, 158 00, Praha 5 - Jinonice, tel.: +420 222 204 304\nV Parku 2328/18, 148 00 Praha 4 - Chodov, tel.: +420 222 204 304\nRTG Waltrovka\n\nVeronika ČENKOVÁ\nIdentifikace\n75 59 10 / 0010\nAdresář\nV Třešňovce 224, Praha, 190 00\nPojištěnec 207\n\nDatum a čas popisu:\n14.3.2023\nRTG prstů ruky L, kolene vestoje P\n\nRTG prstů ruky L:\nSkelet bez patrných traumatických změn.\n\nRTG kolene vestoje P:\nPostavení v kloubu správné, kloubní štěrbina není snížená. Incip. FT artrosa s přihrocením interkondylické eminence. Diskrétní známky incep. FP artrosy.\n\nMUDr. Petra Havlasová\nDatum: 16.3.2023 18:57\nCanadian Medical s.r.o., ICP: 01354958, odb. 001, Evropská 859/115, 160 00 Praha 8\n",
            "images": []
        }
    ],
    "documents": [
        {
            "title": "Endoskopie horní části trávicího traktu",
            "date": "2024-08-15",
            "language": "cs",
            "isMedical": true,
            "pages": [
                1
            ]
        },
        {
            "title": "RTG vyšetření",
            "date": "2023-03-14",
            "language": "cs",
            "isMedical": true,
            "pages": [
                2
            ]
        }
    ],
    "tokenUsage": {
        "total": 3948,
        "Proceed step by step. \n    Step 1: \n    Your input is a set of images of most probably a medical report or reports. \n    Your task is to extract all test from the image as plain text documents. Each image is page from the document.\n    Step 2:\n    Assess that all pages are from the same document or multiple documents. I multiple documents are detected, we will mark the invidual documents and the pages they consist of.\n    Step 3: if the page contains other data then text, like images, schemas or photos, extract that area and list them here. If the page is a DICOM image, list the image here. If the page is a photo, list the photo here.\n    ": 3948
    }
} as Assessment;


