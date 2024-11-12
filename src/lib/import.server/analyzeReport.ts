
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
import { error } from '@sveltejs/kit';
import image from './image.json';
import text from './text.json';
import report from './report.json';
import laboratory from './laboratory.json';
import tags from './tags.json';
import dental from './dental.json';
import prescription from './prescription.json';
import immunization from './immunization.json';
import imaging from './imaging.json';
import fhir from './fhir.json';
import patient from './core.patient.json';
import performer from './core.performer.json';
import results from './core.results.json'
//import { extractText } from "./gemini";
import testPropserties from '$data/lab.synonyms.json';
import { fetchGpt } from '$lib/ai/gpt';
import { type Content, type TokenUsage } from '$lib/ai/types.d';
import { sleep } from "$lib/utils";
/**
 * TODO:
 * - Add support for multiple images
 * - Optimize token usage - test gemini text extration
 * - gtp-4o (7k) vs gpt-4o-mini (40k)
 */

const DEBUG = true;


export enum Types {
  image = 'image',
  text = 'text',
  report = 'report',
  laboratory = 'laboratory',
  dental = 'dental',
  imaging = 'imaging',
  prescription = 'prescription',
  immunization = 'immunization',
  dicom = 'dicom',
  fhir = 'fhir'
}





export interface ReportAnalysis {
    type: Types;
    fhirType: string;
    fhir: any;
    cagegory: string;
    isMedical: boolean;
    tags: string[];
    hasPrescription: boolean;
    hasImmunization: boolean;
    hasLabOrVitals: boolean;
    content?: string;
    report?: any;
    //lab?: any;
    text: string;
    imaging?: any;
    prescriptions?: any;
    immunizations?: any;
    results?: {
      test: string;
      value: string;
      unit: string;
      reference: string;
    }[];
    recommendations?: string[];
    tokenUsage: TokenUsage;
}

type Input = {
    images?: string[];
    text?: string;
    language?: string;
};


const schemas: {
    [key: string]: FunctionDefinition
} = {
    image: image as FunctionDefinition,
    text: text as FunctionDefinition,
    report: report as FunctionDefinition,
    laboratory: laboratory as FunctionDefinition,
    dental: dental as FunctionDefinition,
    prescription: prescription as FunctionDefinition,
    immunization: immunization as FunctionDefinition,
    imaging: imaging as FunctionDefinition,
    fhir: fhir as FunctionDefinition

};

let localizedSchemas = updateLanguage(JSON.parse(JSON.stringify(schemas)));

// extend common schemas

(results.items.properties.test.enum as string[]) = testPropserties.map((item: any) => item[0]);
(image.parameters.properties.tags.items.enum as string[]) = [...tags, ...results.items.properties.test.enum];


report.parameters.properties.performer = performer;
imaging.parameters.properties.performer = performer;
laboratory.parameters.properties.performer = performer;
dental.parameters.properties.performer = performer;

report.parameters.properties.patient = patient;
imaging.parameters.properties.patient = patient;
laboratory.parameters.properties.patient = patient;
dental.parameters.properties.patient = patient;


report.parameters.properties.results = results;
laboratory.parameters.properties.results = results;


(report.parameters.properties.bodyParts.items.properties.identification.enum as string[]) = [...tags];
(imaging.parameters.properties.bodyParts.items.properties.identification.enum as string[]) = [...tags];





function getContentDefinition(input: Input): Content[] {
  const content: Content[] = [];
  if (input.text) {
    content.push({
      type: 'text',
      text: input.text
    });
  }
  if (input.images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: input.images[0]
      }
    });
  }
  return content;
}

function updateLanguage(schema: { [key: string]: any }, language: string = 'English') {
  for (const key in schema) {
    if (schema[key] instanceof Object) {
      schema[key] = updateLanguage(schema[key], language);
    } else {
      if (key === 'description' && typeof schema[key] == 'string') {
        if (schema[key].includes('[LANGUAGE]')) {
          schema[key] = schema[key].replace(/\[LANGUAGE\]/ig,language);
        //  console.log('Updated', key, schema[key]);
        }
        
      }
    }
  }
  return schema;
}


export async function analyze(input : Input): Promise<ReportAnalysis> {

    const tokenUsage : TokenUsage = {
      total: 0
    };


    const content: Content[] = getContentDefinition(input);
    const currentLanguage = input.language || 'English';

    localizedSchemas = updateLanguage(JSON.parse(JSON.stringify(schemas)), currentLanguage);

    console.log('Schema updated...', currentLanguage)
  
    if (DEBUG) {
        await sleep(2500);
        return Promise.resolve(TEST_DATA);
    }

    // get basic item info
    let data = await evaluate(content, input.images ? Types.image : Types.text, tokenUsage) as ReportAnalysis;
    console.log('input assesed...');

    if (!data.isMedical) {
      error(400, { message: 'Not a medical input' });
    }

    if (data.hasPrescription) {
      const prescription = await evaluate([{
        type: 'text',
        text: data.text
      }], Types.prescription, tokenUsage);
      if (prescription.prescriptions.length > 0) {
        data.prescriptions = prescription.prescriptions;
      }
    }

    if (data.hasImmunization) {
      const immunization = await evaluate([{
        type: 'text',
        text: data.text
      }], Types.immunization, tokenUsage);
      if (immunization.immunizations.length > 0) {
        data.immunizations = immunization.immunizations;
      }
    }


    switch (data.type) {
        case Types.report:
            //data.report = await evaluate(content, Types.report);
            data.report = await evaluate([{
              type: 'text',
              text: data.text
            }], Types.report, tokenUsage);
            // extract lab or vitals from the report
            if (data.hasLabOrVitals) {
              const laboratory = await evaluate([{
                type: 'text',
                text: data.text
              }], Types.laboratory, tokenUsage);
              data.results = laboratory.results;
            }
            break;
        case Types.laboratory:
            // extract lab or vitals from the report
            data.report = await evaluate([{
              type: 'text',
              text: data.text
            }], Types.laboratory, tokenUsage);
            data.report.category = 'laboratory';
            break;
        case Types.dental:
            // extract dental info from the report
            data.report = await evaluate([{
              type: 'text',
              text: data.text
            }], Types.dental, tokenUsage);
            break;
        case Types.imaging:
        case Types.dicom:
            // evaluate imaging data
            data.report = await evaluate(content, Types.imaging, tokenUsage);
            data.report.category = 'imaging';
            break;
    }
/*
    data.fhir = await evaluate([{
      type: 'text',
      text: JSON.stringify(data)
    }], Types.fhir, tokenUsage);
*/
    data.tokenUsage = tokenUsage;

    console.log('All done...', data.tokenUsage.total)
    // return item
    return data;
}



export async function evaluate(content: Content[], type: Types, tokenUsage: TokenUsage): Promise<ReportAnalysis> {


    const schema = localizedSchemas[type];

    if (!schema) error(500, { message: 'Invalid type' });


    return await fetchGpt(content, schema, tokenUsage) as ReportAnalysis;;
}




const TEST_DATA: ReportAnalysis = {
    "isMedical": true,
    "type": "dicom",
    "language": "cs",
    "text": "",
    "tags": [
        "hand",
        "knee",
        "artrosis"
    ],
    "hasLabOrVitals": false,
    "hasPrescription": false,
    "hasImmunization": false,
    "report": {
        "title": "X-ray of Left Hand Fingers and Right Knee while Standing",
        "bodyParts": [
            {
                "identification": "L_finger_bones",
                "status": "Skeletal structure without apparent traumatic changes.",
                "diagnosis": "",
                "treatment": ""
            },
            {
                "identification": "R_knee",
                "status": "Proper joint positioning, joint space is not reduced.",
                "diagnosis": "Initial FT osteoarthritis with pointed intercondylar eminence. Discreet signs of initial FP osteoarthritis.",
                "treatment": ""
            }
        ],
        "date": "2023-03-16 18:57:00",
        "performer": {
            "institution": "Centrum pohybové medicíny Pavla Koláře, a.s.",
            "address": {
                "street": "Waltrova náměstí 329/2",
                "city": "Praha",
                "postalCode": "158 00",
                "country": "Czech Republic"
            }
        },
        "patient": {
            "name": "Veronika CENKOVÁ",
            "dob": "1975-09-10",
            "identifier": "75 59 10 / 0010"
        },
        "category": "imaging"
    },
    "tokenUsage": {
        "total": 6207,
        "Proceed step by step. Identify the content of the text. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical.   All results should be in English language, except for contents which is in the original language of the report.": 820,
        "You are an expert in analysis of medical imaging data. Proceed step by step. Identify the content of the image. We are analyzing medical data, if it is not a medical imaging, mark it as notMedical. We want to identify the contents of the image. With each section provide only information contained in the document.": 5387
    }
}

/*

{
  "isMedical": true,
  "type": "laboratory",
  "language": "cs",
  "text": "**EUC Laboratoře, s.r.o.**\nPalackého 5, 110 00 Praha 1\nIČO: 26775816  \nEUC OKB\n\n**Veronika Cenková**  \n**Identifikace**: 75 59 10 / 0010 **Narozen/a**: 10.9.1975  \n**Pohlaví**: F **Plátce**: 207\n\n**Adresa**: V Třešňovce 224/8, 19000 Praha 9, Czech Republic, tel.: 606 609 507, 606 609 507  \n**Vyzádal**: Praktický lékar WAL 958, Praktický lékar WAL, tel: 222 300 300\n**Alergie**: náplast\n\n**17.5.2022    00:00    Laboratorní imunologické vyšetření**\n\n|                                         | Výsledky | Normály                | Jednotky |\n|-----------------------------------------|----------|------------------------|----------|\n| **Základní biochemické:**               |          |                        |          |\n| Urea                                    | 4,2      | 2,8 - 8,1              | mmol/l   |\n| Kreatinin                               | 63       | 44 - 80                | umol/l   |\n| Kyselina močová                         | 202      | 143 - 339              | umol/l   |\n| GF CKD-EPI                              | 1,70     | 1,00 - 3,00              | ml/s/1,73m2 |\n| Na - natrium                            | 140      | 136 - 145              | mmol/l   |\n| K - kalium                              | 4,0      | 3,5 - 5,1              | mmol/l   |\n| Cl - chloridy                           | 102      | 98 - 107               | mmol/l   |\n| Mg - hořčík                             | 0,91     | 0,66 - 1,07            | mmol/l   |\n| Železo                                  | 17,6     | 5,8 - 34,5             | umol/l   |\n| Ferritin                                | 218,0    | 13,0 - 150,0           | ng/ml    |\n| Bilirubin celk.                         | 6,6      | 0,0 - 21,0             | umol/l   |\n| ALT                                     | 0,26     | 0,10 - 0,55            | ukat/l   |\n| AST                                     | 0,28     | 0,10 - 0,53            | ukat/l   |\n| GGT                                     | 0,32     | 0,10 - 0,70            | ukat/l   |\n| ALP                                     | 0,96     | 0,58 - 1,75            | ukat/l   |\n| Celk.bílkovina                          | 69       | 64 - 83                | g/l      |\n| Albumin                                 | 45,3     | 35,0 - 52,0            | g/l      |\n| Cholesterol                             | 4,2      | 2,9 - 5,0              | mmol/l   |\n| HDL cholesterol                         | 1,97     | 1,20 - 2,70            | mmol/l   |\n| LDL cholesterol                         | 1,94     | 1,20 - 3,00            | mmol/l   |\n| Triglyceridy                            | 0,63     | 0,45 - 1,70            | mmol/l   |\n| Vitamín D                               | 78,3     | 75,0 - 125,0           | nmol/l   |\n\n**Diabetologie:**\n\n| Glukóza                                 | 4,9       | 3,9 - 5,6              | mmol/l   |\n\n**Hematologie:**\n\n| WBC - leukocyty                         | 6,1       | 4,0 - 10,0             | 10^9/l   |\n| RBC - erytrocyty                        | 4,14      | 3,80 - 5,20            | 10^12/l  |\n| HB - hemoglobin                         | 132       | 120 - 160              | g/l      |\n| HCT - hematokrit                        | 0,390     | 0,350 - 0,470          | l/l      |\n| MCV - střed.obj.ery                     | 94,2      | 82,0 - 98,0            | fl       |\n| MCHC - střed.kon.bilkovina              | 338       | 320 - 360              | g/l      |\n| MCH - st. hm. ery                       | 32        | 28 - 34               | pg       |\n| PLT - trombocyty                        | 244       | 150 - 400              | 10^9/l   |\n| RDW                                     | 12,0      | 10,0 - 15,2            | %        |\n| Neutrofily. segmenty                    | 67,8      | 45,0 - 70,0            | %        |\n| Lymfocyty                               | 22,2      | 20,0 - 45,0            | %        |\n| Monocyty                                | 9,0       | 2,0 - 12,0             | %        |\n| Eosinofily                              | 0,7       | 0,0 - 5,0              | %        |\n| Basofily                                | 0,3       | 0,0 - 2,0              | %        |\n| Neutrofily abs.                         | 4,13      | 2,00 - 7,00            | 10^9/l   |\n| Lymfocyty abs.                          | 1,35      | 0,80 - 4,00            | 10^9/l   |\n| Monocyty abs.                           | 0,55      | 0,08 - 1,20            | 10^9/l   |\n| Eozinofily abs.                         | 0,04      | 0,00 - 0,50            | 10^9/l   |\n| Bazofily abs.                           | 0,02      | 0,00 - 0,20            | 10^9/l   |\n\n**Imunoglobuliny a pro:**",
  "tags": [
      "Urea",
      "Creatinine",
      "Uric Acid",
      "Sodium",
      "Calcium",
      "Phosphate",
      "Potassium",
      "Chloride",
      "Magnesium",
      "Iron",
      "Ferritin",
      "Bilirubin",
      "ALT",
      "AST",
      "GGT",
      "ALP",
      "Total Protein",
      "Albumin",
      "HDL",
      "LDL",
      "Cholesterol",
      "Triglycerides",
      "Vitamin D",
      "Glucose",
      "WBC",
      "RBC",
      "Hemoglobin",
      "Hematocrit",
      "MCV",
      "MCHC",
      "MCH",
      "Platelets",
      "RDW",
      "Neutrophils",
      "Lymphocytes",
      "Monocytes",
      "Eosinophils",
      "Basophils"
  ],
  "hasLabOrVitals": true,
  "hasPrescription": false,
  "hasImmunization": false,
  "report": {
      "title": "Laboratorní imunologické vyšetření",
      "summary": "Laboratorní vyšetření pro Veroniku Cenkovou zahrnovalo základní biochemii, diabetologii a hematologii. Byly testovány parametry jako močovina, kreatinin, kyselina močová, železo, bilirubin, celkový cholesterol a další. Všechny výsledky byly v normálním rozmezí kromě ferritinu, který byl lehce zvýšen.",
      "date": "2022-05-17 00:00:00",
      "samplte_date": "",
      "performer": {
          "institution": "EUC Laboratoře, s.r.o.",
          "address": {
              "street": "Palackého 5",
              "city": "Praha 1",
              "postalCode": "110 00",
              "country": "Czech Republic"
          }
      },
      "patient": {
          "name": "Veronika Cenková",
          "gender": "female",
          "identifier": "75 59 10 / 0010",
          "dob": "1975-09-10"
      },
      "results": [
          {
              "test": "Urea",
              "value": "4,2",
              "unit": "mmol/l",
              "reference": "2,8 - 8,1",
              "urgency": 1
          },
          {
              "test": "Creatinine",
              "value": "63",
              "unit": "umol/l",
              "reference": "44 - 80",
              "urgency": 1
          },
          {
              "test": "Uric Acid",
              "value": "202",
              "unit": "umol/l",
              "reference": "143 - 339",
              "urgency": 1
          },
          {
              "test": "eGFR",
              "value": "1,70",
              "unit": "ml/s/1,73m2",
              "reference": "1,00 - 3,00",
              "urgency": 1
          },
          {
              "test": "Sodium",
              "value": "140",
              "unit": "mmol/l",
              "reference": "136 - 145",
              "urgency": 1
          },
          {
              "test": "Potassium",
              "value": "4,0",
              "unit": "mmol/l",
              "reference": "3,5 - 5,1",
              "urgency": 1
          },
          {
              "test": "Chloride",
              "value": "102",
              "unit": "mmol/l",
              "reference": "98 - 107",
              "urgency": 1
          },
          {
              "test": "Magnesium",
              "value": "0,91",
              "unit": "mmol/l",
              "reference": "0,66 - 1,07",
              "urgency": 1
          },
          {
              "test": "Iron",
              "value": "17,6",
              "unit": "umol/l",
              "reference": "5,8 - 34,5",
              "urgency": 1
          },
          {
              "test": "Ferritin",
              "value": "218,0",
              "unit": "ng/ml",
              "reference": "13,0 - 150,0",
              "urgency": 2
          },
          {
              "test": "Bilirubin",
              "value": "6,6",
              "unit": "umol/l",
              "reference": "0,0 - 21,0",
              "urgency": 1
          },
          {
              "test": "ALT",
              "value": "0,26",
              "unit": "ukat/l",
              "reference": "0,10 - 0,55",
              "urgency": 1
          },
          {
              "test": "AST",
              "value": "0,28",
              "unit": "ukat/l",
              "reference": "0,10 - 0,53",
              "urgency": 1
          },
          {
              "test": "GGT",
              "value": "0,32",
              "unit": "ukat/l",
              "reference": "0,10 - 0,70",
              "urgency": 1
          },
          {
              "test": "ALP",
              "value": "0,96",
              "unit": "ukat/l",
              "reference": "0,58 - 1,75",
              "urgency": 1
          },
          {
              "test": "Total Protein",
              "value": "69",
              "unit": "g/l",
              "reference": "64 - 83",
              "urgency": 1
          },
          {
              "test": "Albumin",
              "value": "45,3",
              "unit": "g/l",
              "reference": "35,0 - 52,0",
              "urgency": 1
          },
          {
              "test": "Cholesterol",
              "value": "4,2",
              "unit": "mmol/l",
              "reference": "2,9 - 5,0",
              "urgency": 1
          },
          {
              "test": "HDL",
              "value": "1,97",
              "unit": "mmol/l",
              "reference": "1,20 - 2,70",
              "urgency": 1
          },
          {
              "test": "LDL",
              "value": "1,94",
              "unit": "mmol/l",
              "reference": "1,20 - 3,00",
              "urgency": 1
          },
          {
              "test": "Triglycerides",
              "value": "0,63",
              "unit": "mmol/l",
              "reference": "0,45 - 1,70",
              "urgency": 1
          },
          {
              "test": "Vitamin D",
              "value": "78,3",
              "unit": "nmol/l",
              "reference": "75,0 - 125,0",
              "urgency": 1
          },
          {
              "test": "Glucose",
              "value": "4,9",
              "unit": "mmol/l",
              "reference": "3,9 - 5,6",
              "urgency": 1
          },
          {
              "test": "WBC",
              "value": "6,1",
              "unit": "10^9/l",
              "reference": "4,0 - 10,0",
              "urgency": 1
          },
          {
              "test": "RBC",
              "value": "4,14",
              "unit": "10^12/l",
              "reference": "3,80 - 5,20",
              "urgency": 1
          },
          {
              "test": "Hemoglobin",
              "value": "132",
              "unit": "g/l",
              "reference": "120 - 160",
              "urgency": 1
          },
          {
              "test": "Hematocrit",
              "value": "0,390",
              "unit": "l/l",
              "reference": "0,350 - 0,470",
              "urgency": 1
          },
          {
              "test": "MCV",
              "value": "94,2",
              "unit": "fl",
              "reference": "82,0 - 98,0",
              "urgency": 1
          },
          {
              "test": "MCHC",
              "value": "338",
              "unit": "g/l",
              "reference": "320 - 360",
              "urgency": 1
          },
          {
              "test": "MCH",
              "value": "32",
              "unit": "pg",
              "reference": "28 - 34",
              "urgency": 1
          },
          {
              "test": "Platelets",
              "value": "244",
              "unit": "10^9/l",
              "reference": "150 - 400",
              "urgency": 1
          },
          {
              "test": "RDW",
              "value": "12,0",
              "unit": "%",
              "reference": "10,0 - 15,2",
              "urgency": 1
          },
          {
              "test": "Neutrophils",
              "value": "67,8",
              "unit": "%",
              "reference": "45,0 - 70,0",
              "urgency": 1
          },
          {
              "test": "Lymphocytes",
              "value": "22,2",
              "unit": "%",
              "reference": "20,0 - 45,0",
              "urgency": 1
          },
          {
              "test": "Monocytes",
              "value": "9,0",
              "unit": "%",
              "reference": "2,0 - 12,0",
              "urgency": 1
          },
          {
              "test": "Eosinophils",
              "value": "0,7",
              "unit": "%",
              "reference": "0,0 - 5,0",
              "urgency": 1
          },
          {
              "test": "Basophils",
              "value": "0,3",
              "unit": "%",
              "reference": "0,0 - 2,0",
              "urgency": 1
          },
          {
              "test": "Neutrophils Absolute",
              "value": "4,13",
              "unit": "10^9/l",
              "reference": "2,00 - 7,00",
              "urgency": 1
          },
          {
              "test": "Lymphocytes Absolute",
              "value": "1,35",
              "unit": "10^9/l",
              "reference": "0,80 - 4,00",
              "urgency": 1
          },
          {
              "test": "Monocytes Absolute",
              "value": "0,55",
              "unit": "10^9/l",
              "reference": "0,08 - 1,20",
              "urgency": 1
          },
          {
              "test": "Eosinophils Absolute ",
              "value": "0,04",
              "unit": "10^9/l",
              "reference": "0,00 - 0,50",
              "urgency": 1
          },
          {
              "test": "Basophils Absolute",
              "value": "0,02",
              "unit": "10^9/l",
              "reference": "0,00 - 0,20",
              "urgency": 1
          }
      ],
      "category": "laboratory"
  },
  "tokenUsage": {
      "total": 11841,
      "image": 7783,
      "lab": 4058
  }
}
*/



/*{
    "isMedical": true,
    "type": "report",
    "language": "cs",
    "text": "Rodné číslo: 116103/1355\nPojišťovna: 111\nVěk: 12 let, 9 měsíců\nOdbornost: 705\nIČP: 10-346-001\nLékař: MUDr Jana Syslová\nDatum: 26.8.2024\nČas: 09:18\n\nPacient: Mašková Andrea Sofie\nBydliště: Na Strži 57, 14000 Praha 4\nTelefon: 773594110\nZařízení: MEDOFTAL s.r.o.\nAdresa: Jabloňová 8, 10600 Praha 10-Záběhlice\nTelefon: 267 295 371\n\nNO: nyní 5. den otok HV OL, niko nekapal, bylo oteklé, nyní lepší\nOO: AA: O OA:\nObj:\nVOP: 1,0 nat.\nVOL 0,9-1, (1-1) nat.\nNopht palp. Tn bil.\nOP: PS klidný, v okrajích víček mírné šupinek, bez zarudnutí, spoj. klidná, R jasná, PK vtv. žirá, Z okr. VC, fu- orient. bv\nobl.: zad. polu bpn\nOL: na HV uprarest folikul palp. drobná okr. rezistence mírné okoto v obl. granulomu, po šetrné palpaici bez expresce, v okrajích víček mírné šupinek, R jasná, PK vtv. žirá, Z okr. VC, fu- orient. bpn\nZávěr: Chalaeson palp. sup. acutum l.sin.\n\nTerapie: OL: Tobradex gtt 5xd po 3 dnech 3xd, celk. 7-10 dní a EX studené obkládky, poté Blefagel na víčka\nKo: při obtížích š zhoršení hned, jinak podle potřeby\nPacient byl poučen, byl mü vysvělen režim léěy a kontrol. všechny položené otázky byly zodpovezeny. Pacient odchází ve stabilizovaném stavu.\nPředapsané léky: TOBRADEX 3MG/ML+1MG/ML OPH GTT SUS 1X5ML, 0225172 (1x). 5x za den do OL",
    "tags": [
        "eyes",
        "eyelashes",
        "eyebrows"
    ],
    "hasLabOrVitals": false,
    "hasPrescription": true,
    "hasImmunization": false,
    "prescriptions": [
        {
            "name": "TOBRADEX 3MG/ML+1MG/ML OPH GTT SUS",
            "dosage": "3mg/ml+1mg/ml",
            "route": "ophthalmic",
            "form": "liquid",
            "days": 7,
            "days_of_week": [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday"
            ],
            "times_per_day": 5,
            "time_of_day": [
                "anytime"
            ],
            "notes": "First 3 days: 5 times a day, then 3 times a day."
        }
    ],
    "report": {
        "category": "exam",
        "title": "Examination Report - Chalaeson Acutum",
        "summary": "Patient Andrea Sofie Mašková, 12 years old, presented with swelling on the upper left eyelid lasting for 5 days. Initial symptoms included untreated swelling, which has now improved. Examination reveals mild scaling at the eyelid margins, clear conjunctiva, and a well-defined posterior chamber. A small area of resistance without discharge was palpated in the upper left eyelid, suggesting granuloma. Diagnosis is acute palpated chalaeson on the left side. Treatment includes Tobradex drops and cold compresses. Follow-up as needed, patient was educated about the treatment and left in stable condition.",
        "content": "**NO:** nyní 5. den otok HV OL, niko nekapal, bylo oteklé, nyní lepší\n**OO:** AA: O OA:\n**Obj:**\n- **VOP:** 1,0 nat.\n- **VOL:** 0,9-1, (1-1) nat.\n- **Nopht:** palp. Tn bil.\n**OP:** PS klidný, v okrajích víček mírné šupinek, bez zarudnutí, spoj. klidná, R jasná, PK vtv. žirá, Z okr. VC, fu- orient. bv\n- **obl.:** zad. polu bpn\n**OL:** na HV uprarest folikul palp. drobná okr. rezistence mírné okoto v obl. granulomu, po šetrné palpaici bez expresce, v okrajích víček mírné šupinek, R jasná, PK vtv. žirá, Z okr. VC, fu- orient. bpn\n**Závěr:** Chalaeson palp. sup. acutum l.sin.\n\n**Terapie:**\n- OL: Tobradex gtt 5xd po 3 dnech 3xd, celk. 7-10 dní a EX studené obkládky, poté Blefagel na víčka\n- **Ko:** při obtížích š zhoršení hned, jinak podle potřeby\n\nPacient byl poučen, byl mü vysvělen režim léěy a kontrol. všechny položené otázky byly zodpovezeny. Pacient odchází ve stabilizovaném stavu.\nPředapsané léky: TOBRADEX 3MG/ML+1MG/ML OPH GTT SUS 1X5ML, 0225172 (1x). 5x za den do OL",
        "localizedContent": "**NO:** Now, 5th day of swelling on the upper left eyelid, no drops were applied, it was swollen, now better\n**OO:** AA: O OA:\n**Obj:**\n- **VOP:** 1.0 naturally.\n- **VOL:** 0.9-1, (1-1) naturally.\n- **Nopht:** palp. Tn bil.\n**OP:** PS calm, slight scaling at the edges of the eyelids, no redness, clear conjunctiva, R clear, PC well-defined, Z limited VC, fu- oriented bv\n- **obl.:** rear pole no pathologic findings\n**OL:** on the upper left eyelid follicle palpated, small localized resistance with mild swelling in the area of granuloma, no discharge on gentle palpation, slight scaling at the edges of the eyelids, R clear, PC well-defined, Z limited VC, fu- oriented no pathologic findings\n**Conclusion:** Acute palpated chalaeson on the left side.\n\n**Therapy:**\n- OL: Tobradex drops 5 times a day, after 3 days 3 times a day, total 7-10 days and cold compresses, then Blefagel for the eyelids\n- **Follow-up:** If symptoms worsen, return immediately, otherwise as needed.\n\nThe patient was informed, the treatment regimen and follow-up was explained, and all questions were answered. The patient left in stable condition.\nPrescribed medication: TOBRADEX 3MG/ML+1MG/ML OPH DROPS SUSP 1X5ML, 0225172 (1x). 5 times a day into the left eye.",
        "recommendations": [
            {
                "urgency": 2,
                "description": "Use Tobradex drops 5 times daily for the first 3 days, then reduce to 3 times daily for a total of 7-10 days."
            },
            {
                "urgency": 2,
                "description": "Apply cold compresses to the affected eye area."
            },
            {
                "urgency": 2,
                "description": "Use Blefagel on the eyelids after the initial treatment with Tobradex."
            },
            {
                "urgency": 3,
                "description": "Follow up if symptoms worsen immediately, otherwise as needed."
            }
        ],
        "bodyParts": [
            {
                "identification": "eyelashes",
                "status": "scaling at the edges of the eyelids",
                "diagnosis": "acute palpated chalaeson",
                "treatment": "Tobradex drops, cold compresses, Blefagel",
                "urgency": 3
            },
            {
                "identification": "eyes",
                "status": "localized resistance with mild swelling in the area of granuloma",
                "diagnosis": "",
                "treatment": "Tobradex drops, cold compresses, Blefagel",
                "urgency": 3
            }
        ],
        "date": "2024-08-26 09:18:00",
        "performer": {
            "doctor": {
                "fn": "MUDr Jana Syslová",
                "familyName": "Syslová",
                "givenName": "Jana",
                "honorificPrefix": "MUDr"
            },
            "role": "eye specialist",
            "institution": "MEDOFTAL s.r.o.",
            "address": {
                "street": "Jabloňová 8",
                "city": "Praha 10-Záběhlice",
                "postalCode": "10600",
                "country": "Czech Republic"
            },
            "phone": "267 295 371"
        },
        "patient": {
            "name": "Andrea Sofie Mašková",
            "dob": "",
            "identifier": "116103/1355"
        }
    },
    "tokenUsage": {
        "total": 15997,
        "image": 7059,
        "prescription": 1163,
        "report": 7775
    }
}*/