
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
import { error, text } from '@sveltejs/kit';
import assessSchemaImage from '$lib/configurations/import.assesments';
import { fetchGpt } from '$lib/ai/gpt';
import { type Content, type TokenUsage } from '$lib/ai/types.d';
import { sleep } from "$lib/utils";
import { env } from '$env/dynamic/private';


const DEBUG = env.DEBUG_ASSESSER  === 'true';



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
        await sleep(1500);
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
            "text": "Fakultní Thomayerova nemocnice\nIČ: 00064190\nVídeňská 800, 140 59 Praha 4 Krč\n\nOddělení ORL a chirurgie hlavy a krku\nPřednosta: MUDr. Aleš Čoček, Ph.D. Dr. med.\nORL oddělení - ambulance ORL\n\nORL vyšetření\n\nPacient: Mašková Irena\nBydliště: Severní IV 614/13, Praha 4, 140 00\nDatum vyšetření: 30.01.2023, 8.19\n\nIdent.č.: 485811033\nDatum narození: 11.8.1948\nPohlaví: žena\n\nPoj.: 111\n\nNález:\nNO: 12.1.23 vyšetřena pro týden postupně narůstající odynofagie, s bolestmi v krku, polykání přes bolesti volné, afonie úplná, hlas jasný, afebrilní. Přeléčena herpesiin, při nausea užívala helicid.\nNyní bolesti při polykání nejsou, přetrvává dráždění ke kašli přes den, ale nastydlá se necítí.\nOA: aHT, artroso\nFA: antihypertenziva\n\nobj.\npalp. na krku bez rezistence, fce n.VII zachovalá, výstup n.V palp. nebol.\noro- sliznice úklidné, jazyk nepovleklý, pláty středem, vývody slinných žlaz klidné, slina čirá, tonsily klidné, bez sekretu.\nlaryngo (opt.)- hrtan faryng. oblouk vlevo, velká asymetrická obsahuje štíhlá, hladké, sym. pohyb.vé leukoplakii, vlevo hyposinský - infiltrát sliznice piriformní sínů zhyper.s infiltrát.\n\nZáv: Asymetrická hypertrofie L arytenoidní oblasti s přechodem do pirif. sinu, zaléčen aftosní infekt, s regresí, ne však zcela upravením nálezu.\n\nDop: Helcid 20mg 1-0-1. Platí termín k MLS a esofgoskopii s probat. excisemi na 10.2.23, příjem 9.2. Seznam předoper. vyš. vydán.\nPřeoper. anesteziol. vyš. 8.2.23 v 9 hod (pac. G6)\nEndoskopické výkony provedeny pomocí videofečetězce.\n\nDiagnózy epizody:\nJ060 - Akutní zánět hltanu i hrtanu - laryngopharyngitis acuta\n\nMUDr. Ludmila Vylečková,\nV Praze, 30.1.2023\n\nTisk: 30.01.2023 08:19\n\nStrana: 1 / 1"
        }
    ],
    "documents": [
        {
            "title": "ORL vyšetření",
            "date": "2023-01-30",
            "language": "cs",
            "isMedical": true,
            "pages": [
                1
            ]
        }
    ],
    "tokenUsage": {
        "total": 2181,
        "Proceed step by step. \n    Step 1: \n    Your input is a set of images of most probably a medical report or reports. \n    Your task is to extract all text from the image as plain markdown documents. Each image is page from the document.\n    Step 2:\n    Assess that all pages are from the same document or multiple documents. I multiple documents are detected, we will mark the invidual documents and the pages they consist of.\n    Step 3: if the page contains other data then text, like images, schemas or photos, extract that area and list them here. If the page is a DICOM image, list the image here. If the page is a photo, list the photo here.\n    ": 2181
    }
} as Assessment;/*{
    "pages": [
        {
            "page": 1,
            "text": "Laboratoře EUC Laboratoře, s.r.o. Palackého 5, 110 00 Praha 1 IČO: 26775816 EUC OKB Identifikace 75 59 10 / 0010 Narozen/a 10.9.1975 Pohlaví F Plátce 987 Veronika CENKOVÁ Adresa V Třešňovce 224/8, 19000 Praha 9, Czech Republic, tel.: 606 609 507, 606 609 507, email: vcenkova@pfpeurope.com Vyžádal Interna Waltrovka 910, Interna Waltrovka, tel: 222 300 300, MUDr. Miluše Vostradeovská Alergie náplast 23.5.2023 08:06 Laboratorní vyšetření: EUC OKBH Výsledky Normály Jednotky Základní biochemická Urea 3.9 2,8 - 8,1 mmol/l Kreatinin 69 44 - 80 umol/l Kyselina močová 258 143 - 339 umol/l GF CKD-EPI 1,51 1,00 - 3,00 ml/s/1,73m2 Na - natrium 139 136 - 145 mmol/l K - kalium 4,4 3,5 - 5,1 mmol/l Cl - chloridy 102 98 - 107 mmol/l Mg - hořčík 0,92 0,66 - 1,07 mmol/l Bilirubin celk. 8,6 0,0 - 21,0 umol/l ALT 0,31 0,10 - 0,55 ukat/l AST 0,37 0,10 - 0,53 ukat/l GGT 0,25 0,10 - 0,70 ukat/l ALP 0,89 0,58 - 1,75 ukat/l #AMS ukat/l Celk.bílkovina g/l Albumin g/l Cholesterol 5,2 2,9 - 5,0 mmol/l HDL cholesterol 2,70 1,20 - 2,70 mmol/l LDL cholesterol 2,38 1,20 - 3,00 mmol/l Triglyceridy 0,56 0,45 - 1,70 mmol/l Vitamín D 71,9 75,0 - 125,0 nmol/l Diabetologie Glukóza 4,6 3,9 - 5,6 mmol/l Hematologie WBC - leukocyty 5,8 4,0 - 10,0 10^9/l RBC - erytrocyty 4,29 3,80 - 5,20 10^12/l HB - hemoglobin 133 120 - 160 g/l HCT - hematokrit 0,394 0,350 - 0,470 l/l MCV-stř.obj.ery 91,8 82,0 - 98,0 fl MCHC - stř.bark. 338 320 - 360 g/l MCH - bark.ery 31 28 - 34 pg PLT - trombocyty 211 150 - 400 10^9/l RDW 12,1 10,0 - 15,2 % Neutrofíl. segmenty 54,5 45,0 - 70,0 % Lymfocyty 31,8 20,0 - 45,0 % Monocyty 9,2 2,0 - 12,0 % Eosinofily 3,3 0,0 - 5,0 % Basofily 1,2 0,0 - 2,0 % Neutrofily abs. 3,14 2,00 - 7,00 10^9/l Lymfocyty abs. 1,83 0,80 - 4,00 10^9/l Monocyty abs. 0,53 0,08 - 1,20 10^9/l Eozinofily abs. 0,19 0,00 - 0,50 10^9/l Bazofily abs. 0,07 0,00 - 0,20 10^9/l Imunoglobuliny a pro CRP < 0.6 0,0 - 5,0 mg/l",
            "images": []
        },
        {
            "page": 2,
            "text": "EUC Laboratoře, s.r.o., EUC OKB, Palackého 5, 110 00 Praha 1, IČO: 26775816 pacient Veronika CENKOVÁ identifikace 75 59 10 / 0010 narozen/a 10.9.1975 pohlaví F plátce 987 údaje 23.5.2023 Laboratorní vyšetření: EUC OKBH Endokrinologie TSH 1,090 0,270 - 4,200 uIU/ml fT4 18,60 12,00 - 22,00 pmol/l MCHS Moč CH+S Glukóza neg arb.j. Bílkovina neg arb.j. Bilirubin neg arb.j. Urobilinogen neg arb.j. pH 7,5 Krev neg arb.j. Leukocyty neg arb.j. Ketolátky neg arb.j. Nitirty + arb.j. Specifická hustota 1,011 kg/m^3 Základní biochemická Amyláza celk. 1,75 0,47 - 1,67 ukat/l non-HDL cholesterol 2,50 0,00 - 3,80 mmol/l Hematologie ESR sedimentace 7 2 - 37 mm/h MCHS Erytrocyty 3,0 0,0 - 5,0 elem./μl Epitel plochý 7,0 0,0 - 18,0 elem./μl Bakterie 183,0 0,0 - 40,0 elem./μl Ostatní DIFF - ELFO bílkovin - MDRD-UreaAlb 1,53 1,00 - 3,00 ml/s/1,73m2 Mgr. Pavel Nezbeda 01 EUC Laboratoře, s.r.o. Palackého 5, 110 00 Praha 1 EUC OKBH EUC OKB Odb.: 801 Tel.: 321 001 Tcz.: 801 MedicalId - KulID: 17459264 18,8 cm",
            "images": []
        }
    ],
    "documents": [
        {
            "title": "Laboratorní vyšetření: EUC OKBH",
            "date": "2023-05-23",
            "language": "cs",
            "isMedical": true,
            "pages": [
                1,
                2
            ]
        }
    ],
    "tokenUsage": {
        "total": 4386,
        "Proceed step by step. \n    Step 1: \n    Your input is a set of images of most probably a medical report or reports. \n    Your task is to extract all test from the image as plain text documents. Each image is page from the document.\n    Step 2:\n    Assess that all pages are from the same document or multiple documents. I multiple documents are detected, we will mark the invidual documents and the pages they consist of.\n    Step 3: if the page contains other data then text, like images, schemas or photos, extract that area and list them here. If the page is a DICOM image, list the image here. If the page is a photo, list the photo here.\n    ": 4386
    }
}*/


