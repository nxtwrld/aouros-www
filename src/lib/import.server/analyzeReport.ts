
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
import { error } from '@sveltejs/kit';
import featureDetection from '$lib/configurations/feature-detection';
//import text from './text.json';
import report from '$lib/configurations/report';
import laboratory from '$lib/configurations/laboratory';
import tags from '$lib/configurations/tags';
import dental from '$lib/configurations/dental';
import prescription from '$lib/configurations/prescription';
import immunization from '$lib/configurations/immunization';
import imaging from '$lib/configurations/imaging';
//import fhir from './configurations/fhir';
import patient from '$lib/configurations/core.patient';
import performer from '$lib/configurations/core.performer';
import signals from '$lib/configurations/core.signals'
import diagnosis from '$lib/configurations/core.diagnosis';
import bodyParts from '$lib/configurations/core.bodyParts';
import jcard from '$lib/configurations/jcard.reduced';
//import { extractText } from "./gemini";
//import testPropserties from '$data/lab.synonyms.json';
import propertiesDefition from '$data/lab.properties.defaults.json';
import { fetchGpt } from '$lib/ai/gpt';
import { type Content, type TokenUsage } from '$lib/ai/types.d';
import { sleep } from "$lib/utils";
import { env } from '$env/dynamic/private';


/**
 * TODO:
 * - Add support for multiple images
 * - Optimize token usage - test gemini text extration
 * - gtp-4o (7k) vs gpt-4o-mini (40k)
 */

const DEBUG = env.DEBUG_ANALYZER  == 'true';


export enum Types {
  featureDetection = 'featureDetection',
  //text = 'text',
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
    signals?: any;
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
    featureDetection: featureDetection as FunctionDefinition,
    //text: text as FunctionDefinition,
    report: report as FunctionDefinition,
    laboratory: laboratory as FunctionDefinition,
    dental: dental as FunctionDefinition,
    prescription: prescription as FunctionDefinition,
    immunization: immunization as FunctionDefinition,
    imaging: imaging as FunctionDefinition//,
    //fhir: fhir as FunctionDefinition

};

let localizedSchemas = updateLanguage(JSON.parse(JSON.stringify(schemas)));

// extend common schemas

(signals.items.properties.signal.enum as string[]) = Object.keys(propertiesDefition); //testPropserties.map((item: any) => item[0]);
(featureDetection.parameters.properties.tags.items.enum as string[]) = [...tags, ...signals.items.properties.signal.enum];


performer.properties = jcard.properties;
performer.required = jcard.required;

report.parameters.properties.performer = performer;
imaging.parameters.properties.performer = performer;
laboratory.parameters.properties.performer = performer;
dental.parameters.properties.performer = performer;

report.parameters.properties.patient = patient;
imaging.parameters.properties.patient = patient;
laboratory.parameters.properties.patient = patient;
dental.parameters.properties.patient = patient;

//report.parameters.properties.signals = signals;
laboratory.parameters.properties.signals = signals;

report.parameters.properties.diagnosis = diagnosis;
imaging.parameters.properties.diagnosis = diagnosis;
dental.parameters.properties.diagnosis = diagnosis;

(bodyParts.items.properties.identification.enum as string[]) = [...tags];

report.parameters.properties.bodyParts = bodyParts;
imaging.parameters.properties.bodyParts = bodyParts;





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
        await sleep(1500);
        // select and return random TEST_DATA item
        return TEST_DATA[Math.floor(Math.random() * TEST_DATA.length)];
        
    }

    // get basic item info
    let data = await evaluate(content, Types.featureDetection, tokenUsage) as ReportAnalysis;
    console.log('input assesed...');
    
    data.text = input.text

    if (!data.isMedical) {
      error(400, { message: 'Not a medical input' });
    }

    if (data.hasPrescription) {
      const prescription = await evaluate([{
        type: 'text',
        text: data.text
      }], Types.prescription, tokenUsage);
      if (prescription.prescriptions?.length > 0) {
        data.prescriptions = prescription.prescriptions;
      }
    }

    if (data.hasImmunization) {
      const immunization = await evaluate([{
        type: 'text',
        text: data.text
      }], Types.immunization, tokenUsage);
      if (immunization.immunizations?.length > 0) {
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

              data.report.signals = laboratory.signals;
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

    // extend tags with body parts
    if (data.report.bodyParts) {
        data.tags = [...new Set(data.tags.concat(data.report.bodyParts.map((item) => item.identification)))];
    }

    if (data.report.signals) {
        data.report.signals = data.report.signals.map((item) => {
            if (item.signal) {
                item.signal = item.signal.toLowerCase();
            }
            if (item.valueType == 'number') {
                item.value = parseFloat(item.value);
            }
            delete item.valueType;
            return item;
        });
    }

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




const TEST_DATA: ReportAnalysis[] = [{
    "isMedical": true,
    "type": "laboratory",
    "language": "cs",
    "tags": [
        "Urea",
        "Creatinine",
        "Uric Acid",
        "Sodium",
        "Potassium",
        "Chloride",
        "Magnesium",
        "Bilirubin",
        "ALT",
        "AST",
        "GGT",
        "ALP",
        "Cholesterol",
        "HDL",
        "LDL",
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
        "Neutrophils Absolute",
        "Lymphocytes Absolute",
        "Monocytes Absolute",
        "Eosinophils Absolute",
        "Basophils Absolute",
        "CRP",
        "TSH",
        "fT4",
        "Urobilinogen",
        "pH",
        "Nitrites",
        "Specific Gravity",
        "Total Amylase",
        "Bacteria",
        "DIFF",
        "ELFO",
        "MDRD-UreaAlb"
    ],
    "hasLabOrVitals": true,
    "hasPrescription": false,
    "hasImmunization": false,
    "text": "Laboratoře EUC Laboratoře, s.r.o. Palackého 5, 110 00 Praha 1 IČO: 26775816 EUC OKB Identifikace 75 59 10 / 0010 Narozen/a 10.9.1975 Pohlaví F Plátce 987 Veronika CENKOVÁ Adresa V Třešňovce 224/8, 19000 Praha 9, Czech Republic, tel.: 606 609 507, 606 609 507, email: vcenkova@pfpeurope.com Vyžádal Interna Waltrovka 910, Interna Waltrovka, tel: 222 300 300, MUDr. Miluše Vostradeovská Alergie náplast 23.5.2023 08:06 Laboratorní vyšetření: EUC OKBH Výsledky Normály Jednotky Základní biochemická Urea 3.9 2,8 - 8,1 mmol/l Kreatinin 69 44 - 80 umol/l Kyselina močová 258 143 - 339 umol/l GF CKD-EPI 1,51 1,00 - 3,00 ml/s/1,73m2 Na - natrium 139 136 - 145 mmol/l K - kalium 4,4 3,5 - 5,1 mmol/l Cl - chloridy 102 98 - 107 mmol/l Mg - hořčík 0,92 0,66 - 1,07 mmol/l Bilirubin celk. 8,6 0,0 - 21,0 umol/l ALT 0,31 0,10 - 0,55 ukat/l AST 0,37 0,10 - 0,53 ukat/l GGT 0,25 0,10 - 0,70 ukat/l ALP 0,89 0,58 - 1,75 ukat/l #AMS ukat/l Celk.bílkovina g/l Albumin g/l Cholesterol 5,2 2,9 - 5,0 mmol/l HDL cholesterol 2,70 1,20 - 2,70 mmol/l LDL cholesterol 2,38 1,20 - 3,00 mmol/l Triglyceridy 0,56 0,45 - 1,70 mmol/l Vitamín D 71,9 75,0 - 125,0 nmol/l Diabetologie Glukóza 4,6 3,9 - 5,6 mmol/l Hematologie WBC - leukocyty 5,8 4,0 - 10,0 10^9/l RBC - erytrocyty 4,29 3,80 - 5,20 10^12/l HB - hemoglobin 133 120 - 160 g/l HCT - hematokrit 0,394 0,350 - 0,470 l/l MCV-stř.obj.ery 91,8 82,0 - 98,0 fl MCHC - stř.bark. 338 320 - 360 g/l MCH - bark.ery 31 28 - 34 pg PLT - trombocyty 211 150 - 400 10^9/l RDW 12,1 10,0 - 15,2 % Neutrofíl. segmenty 54,5 45,0 - 70,0 % Lymfocyty 31,8 20,0 - 45,0 % Monocyty 9,2 2,0 - 12,0 % Eosinofily 3,3 0,0 - 5,0 % Basofily 1,2 0,0 - 2,0 % Neutrofily abs. 3,14 2,00 - 7,00 10^9/l Lymfocyty abs. 1,83 0,80 - 4,00 10^9/l Monocyty abs. 0,53 0,08 - 1,20 10^9/l Eozinofily abs. 0,19 0,00 - 0,50 10^9/l Bazofily abs. 0,07 0,00 - 0,20 10^9/l Imunoglobuliny a pro CRP < 0.6 0,0 - 5,0 mg/lEUC Laboratoře, s.r.o., EUC OKB, Palackého 5, 110 00 Praha 1, IČO: 26775816 pacient Veronika CENKOVÁ identifikace 75 59 10 / 0010 narozen/a 10.9.1975 pohlaví F plátce 987 údaje 23.5.2023 Laboratorní vyšetření: EUC OKBH Endokrinologie TSH 1,090 0,270 - 4,200 uIU/ml fT4 18,60 12,00 - 22,00 pmol/l MCHS Moč CH+S Glukóza neg arb.j. Bílkovina neg arb.j. Bilirubin neg arb.j. Urobilinogen neg arb.j. pH 7,5 Krev neg arb.j. Leukocyty neg arb.j. Ketolátky neg arb.j. Nitirty + arb.j. Specifická hustota 1,011 kg/m^3 Základní biochemická Amyláza celk. 1,75 0,47 - 1,67 ukat/l non-HDL cholesterol 2,50 0,00 - 3,80 mmol/l Hematologie ESR sedimentace 7 2 - 37 mm/h MCHS Erytrocyty 3,0 0,0 - 5,0 elem./μl Epitel plochý 7,0 0,0 - 18,0 elem./μl Bakterie 183,0 0,0 - 40,0 elem./μl Ostatní DIFF - ELFO bílkovin - MDRD-UreaAlb 1,53 1,00 - 3,00 ml/s/1,73m2 Mgr. Pavel Nezbeda 01 EUC Laboratoře, s.r.o. Palackého 5, 110 00 Praha 1 EUC OKBH EUC OKB Odb.: 801 Tel.: 321 001 Tcz.: 801 MedicalId - KulID: 17459264 18,8 cm",
    "report": {
        "title": "Laboratorní vyšetření",
        "summary": "Tento laboratorní test obsahuje výsledky základních biochemických, hematologických a endokrinologických vyšetření. Základní biochemie zahrnuje například močovinu, kreatinin, kyselinu močovou a další parametry elektrolytů a jaterních funkcí. Některé hodnoty jako cholesterol a vitamín D jsou mimo referenční meze, což může naznačovat zdravotní problémy týkající se lipidového metabolismu. Hematologické výsledky zahrnují leukocyty, erytrocyty, hemoglobin a další krevní parametry. Výsledky endokrinologické části testu ukazují normální hodnoty TSH a volného T4. Výsledky z vyšetření moči jsou převážně negativní, avšak byl nalezen nitrit. Přítomnost bakterií v moči je nad normální mezí, což může naznačovat infekci močových cest.",
        "date": "2023-05-23 08:06:00",
        "performer": {
            "adr": [
                {
                    "street-address": "Palackého 5",
                    "locality": "Praha 1",
                    "postal-code": "110 00",
                    "country-name": "Czech Republic"
                }
            ],
            "email": [
                {
                    "value": null
                }
            ],
            "fn": "EUC Laboratoře, s.r.o.",
            "n": {
                "family-name": [
                    "Nezbeda"
                ],
                "given-name": [
                    "Pavel"
                ]
            },
            "org": [
                {
                    "organization-name": "EUC Laboratoře, s.r.o."
                }
            ],
            "role": [],
            "tel": [
                {
                    "value": "+420321001"
                }
            ],
            "title": []
        },
        "patient": {
            "fullName": "Veronika CENKOVÁ",
            "biologicalSex": "female",
            "identifier": "75 59 10 / 0010",
            "birthDate": "1975-09-10",
            "insurance": {
                "provider": null,
                "number": "987"
            }
        },
        "signals": [
            {
                "signal": "Urea",
                "value": "3.9",
                "unit": "mmol/l",
                "reference": "2.8 - 8.1",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Creatinine",
                "value": "69",
                "unit": "umol/l",
                "reference": "44 - 80",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Uric Acid",
                "value": "258",
                "unit": "umol/l",
                "reference": "143 - 339",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "eGFR",
                "value": "1.51",
                "unit": "ml/s/1.73m2",
                "reference": "1.00 - 3.00",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Sodium",
                "value": "139",
                "unit": "mmol/l",
                "reference": "136 - 145",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Potassium",
                "value": "4.4",
                "unit": "mmol/l",
                "reference": "3.5 - 5.1",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Chloride",
                "value": "102",
                "unit": "mmol/l",
                "reference": "98 - 107",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Magnesium",
                "value": "0.92",
                "unit": "mmol/l",
                "reference": "0.66 - 1.07",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Bilirubin",
                "value": "8.6",
                "unit": "umol/l",
                "reference": "0.0 - 21.0",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "ALT",
                "value": "0.31",
                "unit": "ukat/l",
                "reference": "0.10 - 0.55",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "AST",
                "value": "0.37",
                "unit": "ukat/l",
                "reference": "0.10 - 0.53",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "GGT",
                "value": "0.25",
                "unit": "ukat/l",
                "reference": "0.10 - 0.70",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "ALP",
                "value": "0.89",
                "unit": "ukat/l",
                "reference": "0.58 - 1.75",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Cholesterol",
                "value": "5.2",
                "unit": "mmol/l",
                "reference": "2.9 - 5.0",
                "urgency": 2,
                "date": "2023-05-23"
            },
            {
                "signal": "HDL",
                "value": "2.70",
                "unit": "mmol/l",
                "reference": "1.20 - 2.70",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "LDL",
                "value": "2.38",
                "unit": "mmol/l",
                "reference": "1.20 - 3.00",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Triglycerides",
                "value": "0.56",
                "unit": "mmol/l",
                "reference": "0.45 - 1.70",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Vitamin D",
                "value": "71.9",
                "unit": "nmol/l",
                "reference": "75.0 - 125.0",
                "urgency": 2,
                "date": "2023-05-23"
            },
            {
                "signal": "Glucose",
                "value": "4.6",
                "unit": "mmol/l",
                "reference": "3.9 - 5.6",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "WBC",
                "value": "5.8",
                "unit": "10^9/l",
                "reference": "4.0 - 10.0",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "RBC",
                "value": "4.29",
                "unit": "10^12/l",
                "reference": "3.80 - 5.20",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Hemoglobin",
                "value": "133",
                "unit": "g/l",
                "reference": "120 - 160",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Hematocrit",
                "value": "0.394",
                "unit": "l/l",
                "reference": "0.350 - 0.470",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "MCV",
                "value": "91.8",
                "unit": "fl",
                "reference": "82.0 - 98.0",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "MCHC",
                "value": "338",
                "unit": "g/l",
                "reference": "320 - 360",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "MCH",
                "value": "31",
                "unit": "pg",
                "reference": "28 - 34",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Platelets",
                "value": "211",
                "unit": "10^9/l",
                "reference": "150 - 400",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "RDW",
                "value": "12.1",
                "unit": "%",
                "reference": "10.0 - 15.2",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Neutrophils",
                "value": "54.5",
                "unit": "%",
                "reference": "45.0 - 70.0",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Lymphocytes",
                "value": "31.8",
                "unit": "%",
                "reference": "20.0 - 45.0",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Monocytes",
                "value": "9.2",
                "unit": "%",
                "reference": "2.0 - 12.0",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Eosinophils",
                "value": "3.3",
                "unit": "%",
                "reference": "0.0 - 5.0",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Basophils",
                "value": "1.2",
                "unit": "%",
                "reference": "0.0 - 2.0",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Neutrophils Absolute",
                "value": "3.14",
                "unit": "10^9/l",
                "reference": "2.00 - 7.00",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Lymphocytes Absolute",
                "value": "1.83",
                "unit": "10^9/l",
                "reference": "0.80 - 4.00",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Monocytes Absolute",
                "value": "0.53",
                "unit": "10^9/l",
                "reference": "0.08 - 1.20",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Eosinophils Absolute",
                "value": "0.19",
                "unit": "10^9/l",
                "reference": "0.00 - 0.50",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Basophils Absolute",
                "value": "0.07",
                "unit": "10^9/l",
                "reference": "0.00 - 0.20",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "CRP",
                "value": "< 0.6",
                "unit": "mg/l",
                "reference": "0.0 - 5.0",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "TSH",
                "value": "1.090",
                "unit": "uIU/ml",
                "reference": "0.270 - 4.200",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "fT4",
                "value": "18.60",
                "unit": "pmol/l",
                "reference": "12.00 - 22.00",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Urobilinogen",
                "value": "neg",
                "unit": "arb.j.",
                "reference": "neg",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "pH",
                "value": "7.5",
                "unit": "",
                "reference": "",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Blood",
                "value": "neg",
                "unit": "arb.j.",
                "reference": "neg",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Glucose",
                "value": "neg",
                "unit": "arb.j.",
                "reference": "neg",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Ketones",
                "value": "neg",
                "unit": "arb.j.",
                "reference": "neg",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Nitrites",
                "value": "+",
                "unit": "arb.j.",
                "reference": "neg",
                "urgency": 3,
                "date": "2023-05-23"
            },
            {
                "signal": "Specific Gravity",
                "value": "1.011",
                "unit": "kg/m^3",
                "reference": "",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Total Amylase",
                "value": "1.75",
                "unit": "ukat/l",
                "reference": "0.47 - 1.67",
                "urgency": 2,
                "date": "2023-05-23"
            },
            {
                "signal": "non-HDL Cholesterol",
                "value": "2.50",
                "unit": "mmol/l",
                "reference": "0.00 - 3.80",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "ESR",
                "value": "7",
                "unit": "mm/h",
                "reference": "2 - 37",
                "urgency": 1,
                "date": "2023-05-23"
            },
            {
                "signal": "Bacteria",
                "value": "183.0",
                "unit": "elem./μl",
                "reference": "0.0 - 40.0",
                "urgency": 4,
                "date": "2023-05-23"
            }
        ],
        "category": "laboratory"
    },
    "tokenUsage": {
        "total": 13120,
        "Proceed step by step. Identify the contents of the provided JSON  input. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical.   All results should be in Czech language, except for contents which is in the original language of the report.": 7063,
        "Proceed step by step. Identify the content of the image. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical.   All results should be in Czech language, except for contents which is in the original language of the report.": 6057
    }
}/*,{
    "isMedical": true,
    "type": "report",
    "language": "cs",
    "tags": [
        "esophagus",
        "stomach",
        "pylorus",
        "cardiac_output"
    ],
    "hasLabOrVitals": true,
    "hasPrescription": false,
    "hasImmunization": false,
    "text": "MEDIENDO s.r.o., Thámova 289/13, 186 00 Praha 8\nTel.: +420 273 139 861\nIČZ: 0848600\n\nPacient: Ing. Veronika ČENKOVÁ, r. 1975\nBydliště: V Třešňovce 224, 190 00 Praha 9\nPojišťovna: 207 - Oborová zdravotní pojišťovna  Číslo pojištěnce: 7559100010\nDatum: 15.08.2024\n\nEndoskopie horní části trávicího traktu\nOdesílající lékař: MUDr. Miluše Vostradovská, Praha 8, Canadian Medical s.r.o. - AFI, IČP: 01354961\nIndikace: Dyspeptický syndrom recidiv. Bolest břicha.\nPřístroje: Gastroskop Pentax MAGiNA EG29-i10c, v.č. E0006120500, Insuflátor CO2 v.č. C000875, Pulzní oxymetr Nellcor PM100N, v.č. MBP1628.072\nAsistence: Hana Kubů\nPremedikace: Lidocain 10% spray\n\nNález:\nPřístroj volně zaveden do jícnu, který ve svém průběhu intaktní. Z-linie v 39cm od řezáků. Kardie nedovírá. \nŽaludek se po insuflaci přiměřeně rozvíjí, řasy autoplastické, jezírko čiré.\nSliznice fundu, těla a antra žaludku klidná. Pylorus okrouhlý, volně prostupný.\nV bulbu a D2 je normální nález.\nVýkon bez komplikací.\n\nZávěr:\nInkompetence kardie, jinak normální nález endoskopický nález v rozsahu jícen - D2.\n\nDoporučení:\nPo výkonu jednu hodinu nepít, nejíst, nekouřit.\nAntirefluxní dieta z režimová opatření, ev. PPI nebo prokinetika.\nPacient poučen o nepití, po vyšetření, odchází v klinicky stabilizovaném stavu.\n\nKrevní tlak/puls/saturace\nTK: 130/98 Puls: 88 Saturace: 97%\n\nMUDr. Tomáš Grega\nDatum: 15.08.2024 8:21:23\nMUDr. Tomáš Grega\n\nMediendo s.r.o.,\nGastroenterologie, oob. 105\nThámová 289/13\n186 00 Praha 8\nTel. 273 139 861",
    "report": {
        "category": "procedure",
        "title": "Endoskopie horní části trávicího traktu",
        "summary": "Pacientka Ing. Veronika Čenková podstoupila endoskopii horní části trávicího traktu, při níž byla zjištěna inkompetence kardie, avšak bez dalších abnormalit v rozsahu od jícnu po D2. Sliznice žaludku byla klidná a pylorus volně prostupný. Výkon proběhl bez komplikací. Pacientka byla poučena o následném režimovém opatření a odchází v klinicky stabilizovaném stavu.",
        "content": "**Endoskopie horní části trávicího traktu**  \n**Odesílající lékař:** MUDr. Miluše Vostradovská, Praha 8, Canadian Medical s.r.o. - AFI, IČP: 01354961  \n**Indikace:** Dyspeptický syndrom recidiv. Bolest břicha.  \n**Přístroje:** Gastroskop Pentax MAGiNA EG29-i10c, v.č. E0006120500, Insuflátor CO2 v.č. C000875, Pulzní oxymetr Nellcor PM100N, v.č. MBP1628.072  \n**Asistence:** Hana Kubů  \n**Premedikace:** Lidocain 10% spray  \n\n### Nález:  \nPřístroj volně zaveden do jícnu, který ve svém průběhu intaktní. Z-linie v 39cm od řezáků. Kardie nedovírá.  \nŽaludek se po insuflaci přiměřeně rozvíjí, řasy autoplastické, jezírko čiré.  \nSliznice fundu, těla a antra žaludku klidná. Pylorus okrouhlý, volně prostupný.  \nV bulbu a D2 je normální nález.  \nVýkon bez komplikací.  \n\n**Závěr:**  \nInkompetence kardie, jinak normální nález endoskopický nález v rozsahu jícen - D2.  \n\n**Doporučení:**  \nPo výkonu jednu hodinu nepít, nejíst, nekouřit.  \nAntirefluxní dieta z režimová opatření, ev. PPI nebo prokinetika.  \nPacient poučen o nepití, po vyšetření, odchází v klinicky stabilizovaném stavu.  \n\n**Krevní tlak/puls/saturace**  \nTK: 130/98  \nPuls: 88  \nSaturace: 97%  \n\n**MUDr. Tomáš Grega**  \n**Datum:** 15.08.2024 8:21:23  \n\n**MUDr. Tomáš Grega**  \n\nMediendo s.r.o.,  \nGastroenterologie, oob. 105  \nThámová 289/13  \n186 00 Praha 8  \nTel. 273 139 861  ",
        "localizedContent": "**Endoskopie horní části trávicího traktu**\n**Odesílající lékař:** MUDr. Miluše Vostradovská, Praha 8, Canadian Medical s.r.o. - AFI, IČP: 01354961\n**Indikace:** Dyspeptický syndrom recidiv. Bolest břicha.\n**Přístroje:** Gastroskop Pentax MAGiNA EG29-i10c, v.č. E0006120500, Insuflátor CO2 v.č. C000875, Pulzní oxymetr Nellcor PM100N, v.č. MBP1628.072\n**Asistence:** Hana Kubů\n**Premedikace:** Lidokain 10% spray\n\n### Nález:\nPřístroj volně zaveden do jícnu, který ve svém průběhu intaktní. Z-linie v 39cm od řezáků. Kardie nedovírá.\nŽaludek se po insuflaci přiměřeně rozvíjí, řasy autoplastické, jezírko čiré.\nSliznice fundu, těla a antra žaludku klidná. Pylorus okrouhlý, volně prostupný.\nV bulbu a D2 je normální nález.\nVýkon bez komplikací.\n\n**Závěr:**\nInkompetence kardie, jinak normální nález endoskopický nález v rozsahu jícen - D2.\n\n**Doporučení:**\nPo výkonu jednu hodinu nepít, nejíst, nekouřit.\nAntirefluxní dieta z režimová opatření, ev. PPI nebo prokinetika.\nPacient poučen o nepití, po vyšetření, odchází v klinicky stabilizovaném stavu.\n\n**Krevní tlak/puls/saturace**\nTK: 130/98\nPuls: 88\nSaturace: 97%\n\n**MUDr. Tomáš Grega**\n**Datum:** 15.08.2024 8:21:23\n\n**MUDr. Tomáš Grega**\n\nMediendo s.r.o.,\nGastroenterologie, oob. 105\nThámová 289/13\n186 00 Praha 8\nTel. 273 139 861\n",
        "recommendations": [
            {
                "urgency": 3,
                "description": "Po výkonu jednu hodinu nepít, nejíst, nekouřit."
            },
            {
                "urgency": 2,
                "description": "Dodržovat antirefluxní dietu a režimová opatření, ev. užívat inhibitory protonové pumpy (PPI) nebo prokinetika."
            }
        ],
        "date": "2024-08-15",
        "performer": {
            "adr": [
                {
                    "street-address": "Thámová 289/13",
                    "locality": "Praha 8",
                    "postal-code": "186 00",
                    "country-name": "Česká republika"
                }
            ],
            "email": [
                {
                    "value": "info@mediendo.cz"
                }
            ],
            "fn": "MUDr. Tomáš Grega",
            "org": [
                {
                    "organization-name": "Mediendo s.r.o."
                },
                {
                    "organization-name": "Gastroenterologie"
                }
            ],
            "role": [
                "Lékař"
            ],
            "tel": [
                {
                    "value": "273139861",
                    "type": [
                        "work"
                    ]
                }
            ],
            "title": [
                "MUDr."
            ]
        },
        "patient": {
            "fullName": "Ing. Veronika Cenková",
            "identifier": "7559100010",
            "birthDate": "1975",
            "insurance": {
                "provider": "207 - Oborová zdravotní pojišťovna",
                "number": "7559100010"
            }
        },
        "diagnosis": {
            "description": "Inkompetence kardie, jinak normální nález endoskopický nález v rozsahu jícen - D2."
        },
        "bodyParts": [
            {
                "identification": "esophagus",
                "status": "Intaktní",
                "treatment": "Endoskopii",
                "urgency": 1
            },
            {
                "identification": "stomach",
                "status": "Sliznice fundu, těla a antra klidná, pylorus volně prostupný",
                "treatment": "Endoskopii",
                "urgency": 1
            }
        ],
        "signals": [
            {
                "test": "systolic blood pressure",
                "value": "130",
                "unit": "mmHg",
                "reference": "90-120",
                "urgency": 3
            },
            {
                "test": "diastolic blood pressure",
                "value": "98",
                "unit": "mmHg",
                "reference": "60-80",
                "urgency": 4
            },
            {
                "test": "pulse",
                "value": "88",
                "unit": "bpm",
                "reference": "60-100",
                "urgency": 2
            },
            {
                "test": "oxygen saturation",
                "value": "97",
                "unit": "%",
                "reference": "95-100",
                "urgency": 1
            }
        ]
    },
    "tokenUsage": {
        "total": 17665,
        "Proceed step by step. Identify the contents of the provided JSON  input. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical.   All results should be in Czech language, except for contents which is in the original language of the report.": 6098,
        "You are medical expert data analyzer. Proceed step by step. Identify the content of the image. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical. With each section provide only iformation contained in the document. For dates, if only a year is known, just list the year without day or month.  All results should be translated to Czech language, except for 'content' field that keeps the original language of the document.": 8301,
        "Proceed step by step. Identify the content of the image. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical.   All results should be in Czech language, except for contents which is in the original language of the report.": 3266
    }
},
{
    "isMedical": true,
    "type": "report",
    "language": "cs",
    "tags": [
        "L_finger_bones",
        "R_knee"
    ],
    "hasLabOrVitals": false,
    "hasPrescription": false,
    "hasImmunization": false,
    "text": "Centrum pohybové medicíny\nCentrum pohybové medicíny Pavla Koláře, a.s.\nWalterovo náměstí 329/2, 158 00, Praha 5 - Jinonice, tel.: +420 222 204 304\nV Parku 2328/18, 148 00 Praha 4 - Chodov, tel.: +420 222 204 304\nRTG Waltrovka\n\nVeronika ČENKOVÁ\nIdentifikace\n75 59 10 / 0010\nAdresář\nV Třešňovce 224, Praha, 190 00\nPojištěnec 207\n\nDatum a čas popisu:\n14.3.2023\nRTG prstů ruky L, kolene vestoje P\n\nRTG prstů ruky L:\nSkelet bez patrných traumatických změn.\n\nRTG kolene vestoje P:\nPostavení v kloubu správné, kloubní štěrbina není snížená. Incip. FT artrosa s přihrocením interkondylické eminence. Diskrétní známky incep. FP artrosy.\n\nMUDr. Petra Havlasová\nDatum: 16.3.2023 18:57\nCanadian Medical s.r.o., ICP: 01354958, odb. 001, Evropská 859/115, 160 00 Praha 8\n",
    "report": {
        "category": "imaging",
        "title": "RTG vyšetření prstů levé ruky a pravého kolene",
        "summary": "RTG vyšetření prstů levé ruky neodhalilo žádné patrné traumatické změny ve skeletu. Vyšetření pravého kolene vestoje vykazuje správné postavení v kloubu s nesníženou kloubní štěrbinou. Byla diagnostikována začínající femorotibiální artroza s přihrocením interkondylární eminence a diskrétní známky začínající femoropatelární artrozy.",
        "content": "**RTG prstů ruky L:**\n- Skelet bez patrných traumatických změn.\n\n**RTG kolene vestoje P:**\n- Postavení v kloubu správné, kloubní štěrbina není snížená. \n- Incip. FT artrosa s přihrocením interkondylické eminence.\n- Diskrétní známky incep. FP artrosy.",
        "date": "2023-03-16",
        "performer": {
            "adr": [
                {
                    "street-address": "Evropská 859/115",
                    "locality": "Praha 8",
                    "postal-code": "160 00",
                    "country-name": "Česká republika"
                }
            ],
            "email": [],
            "fn": "MUDr. Petra Havlasová",
            "org": [
                {
                    "organization-name": "Canadian Medical s.r.o."
                }
            ],
            "role": [
                "Radiolog"
            ],
            "tel": [],
            "title": []
        },
        "patient": {
            "fullName": "Veronika CENKOVÁ",
            "identifier": "75 59 10 / 0010",
            "insurance": {
                "provider": "207"
            }
        },
        "bodyParts": [
            {
                "identification": "L_finger_bones",
                "status": "Skelet bez patrných traumatických změn.",
                "treatment": "Není potřeba léčba.",
                "urgency": 1
            },
            {
                "identification": "R_knee",
                "status": "Postavení v kloubu správné, kloubní štěrbina není snížená. Incip. FT artrosa s přihrocením interkondylické eminence. Diskrétní známky incep. FP artrosy.",
                "treatment": "Doporučuje se sledování stavu.",
                "urgency": 3
            }
        ]
    },
    "tokenUsage": {
        "total": 12630,
        "Proceed step by step. Identify the contents of the provided JSON  input. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical.   All results should be in Czech language, except for contents which is in the original language of the report.": 5789,
        "You are medical expert data analyzer. Proceed step by step. Identify the content of the image. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical. With each section provide only iformation contained in the document. For dates, if only a year is known, just list the year without day or month.  All results should be translated to Czech language, except for 'content' field that keeps the original language of the document.": 6841
    }
}*/];
