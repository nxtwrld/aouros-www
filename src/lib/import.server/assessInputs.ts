
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
import { error } from '@sveltejs/kit';

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
                        "type": {
                            "type": "string",
                            "description": "Type of the page. If it is a report scan with text, dicom image if it actually contains imaging data or a generic image with little or no text. If it mostly text use 'text'.",
                            "enum": [ "dicom" , "text", "photo" ]
                        },
                        "text": {
                            "type": "string",
                            "description": "Extracted text from the page. "
                        },
                        "language": {
                            "type": "string",
                            "description": "Language of the text. Use the ISO 639-1 code."
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
    type: 'dicom' | 'text' | 'photo';
    language: string;
    text: string;
}

export default async function assess(input : Input): Promise<Assessment> {

    const tokenUsage : TokenUsage = {
      total: 0
    };

    if (DEBUG) {
        await sleep(2500);
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
            "text": "Mediendo s.r.o., Thámova 289/13, 186 00 Praha 8\nTel.: +420 273 139 861\nIČZ: 08486000\nPacient: Ing. Veronika CENKOVÁ, r. 1975\nV Třešňovce 224/8, 19000 Praha 9\nPojišťovna: 207 - Oborová zdravotní pojišťovna\nČíslo pojištěnce: 7559100010\nEndoskopie horní části trávicího traktu\nDatum: 15.08.2024\nOdesílající lékař: MUDr. Miluše Voštadvská, Praha 6, Canadian Medical s.r.o. - AEFI, IČP: 01549661\nIndikace: Dyspeptický syndrom\nrecidiv. Bolest břicha\nPřístroje: Gastroskop Pentax IMAGINA EG29-i10c, v.č. E0061P2500, Insufflator CO2, v.č. C00875, Pulzní oxymetr Nellcor PM100N, v.č. MBP1628.072 Asistence: Hana Kůdová\nPremedikace: Lidocain 10% sprej\nNález:\nPřístroj volně zaveden do jícnu, který ve svém průběhu intaktní.\nZ-linie v 39cm od řezáků, Kardie nedovírá.\nAntelární část fondu, antrum hladké, řasy autoplastické, jezírko čiré.\nSliznice fundu, těla a antra žaludku klidná. Pylorus ohraničený, volně průstupný.\nV bulbuz du 2 normal. nález. Výkon bez komplikací.\nZávěr:\nInkompletní kardie, jinak normální endoskopický nález v rozsahu jícen - D2.\nDoporučení:\nPo výkonu jednu hodinu nepít, nejíst, nekouřit.\nAntirefluxní dietní a režimová opatření, ev. PPI nebo prokinetika.\nPacient poučen o režimu po vyšetření, odchází v klinicky stabilizovaném stavu.\nMUDr. Tomáš Grega\nDatum: 15.08.2024 8:21:23\nMUDr. Tomáš Grega\nKrevní tlak / puls / saturace\nTK: 130/98 Puls: 86 Saturace: 97%",
            "language": "cs"
        },
        {
            "page": 2,
            "text": "Centrum pohybové medicíny Pavla Koláře, a.s.\nWaltrova náměstí 329/2, 158 00, Praha 5 - Jinonice, tel.: +420 222 204 304\nV Parku 2325/18, 148 00 Praha 4 - Chodov, tel: +420 222 204 304\nRTG Waltrovka\nVeronika CENKOVÁ\nIdentifikace: 75 59 10 / 0010\nAdresa: V. Třešňovce 224, Praha, 190 00\nPojišťovna: 207\nNarození: 10.9.1975\nVykázal: Canadian Medical s.r.o., IČP: 01354958, odb: 001, Evropská 859/115, 160 00 Praha 6\n14.3.2023\nRTG prstů ruky L, kolene ve stoje P\nDatum a čas popisu: 16.3.2023 18:57\nRTG prstů ruky L:\nSkelet bez patrných traumatických změn.\nRTG kolene ve stoje P:\nPostavení v kloubu správné, kloubní štěrbina není snížená. In. FT artrosa s přihrocením interkondylické eminence. Diskrétní známky in. FP artrosy.",
            "language": "cs"
        }
    ],
    "documents": [
        {
            "title": "Endoscopy Report",
            "date": "2024-08-15",
            "isMedical": true,
            "pages": [
                1
            ]
        },
        {
            "title": "X-ray Report",
            "date": "2023-03-14",
            "isMedical": true,
            "pages": [
                2
            ]
        }
    ],
    "tokenUsage": {
        "total": 2867,
        "Proceed step by step. \n    Step 1: \n    Your input is a set of images of most probably a medical report or reports. \n    Your task is to extract all test from the image as plain text documents. Each image is page from the document.\n    Step 2:\n    Assess that all pages are from the same document or multiple documents. I multiple documents are detected, we will mark the invidual documents and the pages they consist of.\n    ": 2867
    }
} as Assessment;


