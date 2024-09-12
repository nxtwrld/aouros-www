import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage } from "@langchain/core/messages";
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import image from './image.json';
import report from './report.json';
import lab from './lab.json';
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

/**
 * TODO:
 * - Add support for multiple images
 * - Optimize token usage - test gemini text extration
 * - gtp-4o (7k) vs gpt-4o-mini (40k)
 */


export enum Types {
  image = 'image',
  report = 'report',
  lab = 'lab',
  dental = 'dental',
  imaging = 'imaging',
  prescription = 'prescription',
  immunization = 'immunization',
  dicom = 'dicom',
  fhir = 'fhir'
}

const schemas: {
    [key: string]: FunctionDefinition
} = {
    image: image as FunctionDefinition,
    report: report as FunctionDefinition,
    lab: lab as FunctionDefinition,
    dental: dental as FunctionDefinition,
    prescription: prescription as FunctionDefinition,
    immunization: immunization as FunctionDefinition,
    imaging: imaging as FunctionDefinition,
    fhir: fhir as FunctionDefinition

};

let localizedSchemas = JSON.parse(JSON.stringify(schemas));

// extend common schemas

(results.items.properties.test.enum as string[]) = testPropserties.map((item: any) => item[0]);
(image.parameters.properties.tags.items.enum as string[]) = [...tags, ...results.items.properties.test.enum];


report.parameters.properties.performer = performer;
imaging.parameters.properties.performer = performer;
lab.parameters.properties.performer = performer;
dental.parameters.properties.performer = performer;

report.parameters.properties.patient = patient;
imaging.parameters.properties.patient = patient;
lab.parameters.properties.patient = patient;
dental.parameters.properties.patient = patient;


report.parameters.properties.results = results;
lab.parameters.properties.results = results;




(report.parameters.properties.bodyParts.items.properties.identification.enum as string[]) = [...tags];
(imaging.parameters.properties.bodyParts.items.properties.identification.enum as string[]) = [...tags];

// crawlser through the schamas and check all "description" fields and replace [LANUGAGE]  with the current language






export interface Content {
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
        url: string;
    };
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
    lab?: any;
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

type TokenUsage = {
  total: number;
  [key: string]: number;
}


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
      updateLanguage(schema[key], language);
    } else {
      if (key === 'description' && typeof schema[key] == 'string') {
        if (schema[key].includes('[LANGUAGE]')) {
          schema[key] = schema[key].replace(/\[LANGUAGE\]/ig,language);
          console.log('Updated', key, schema[key]);
        }
        
      }
    }
  }
}


export async function analyze(input : Input): Promise<ReportAnalysis> {

    const tokenUsage : TokenUsage = {
      total: 0
    };


    const content: Content[] = getContentDefinition(input);
    const currentLanguage = input.language || 'English';

    localizedSchemas = updateLanguage(JSON.parse(JSON.stringify(schemas)), currentLanguage);

    console.log('Schema updated...', currentLanguage)
  
    await sleep(500);
    return Promise.resolve(TEST_DATA);

    // get basic item info
    let data = await evaluate(content, Types.image, tokenUsage) as ReportAnalysis;
    console.log('input assesed...');

    if (!data.isMedical) {
      throw error(400, { message: 'Not a medical input' });
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
              const lab = await evaluate([{
                type: 'text',
                text: data.text
              }], Types.lab, tokenUsage);
              data.results = lab.results;
            }
            break;
        case Types.lab:
            // extract lab or vitals from the report
            data.report = await evaluate([{
              type: 'text',
              text: data.text
            }], Types.lab, tokenUsage);
            data.report.category = 'lab';
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


    // Instantiate the parser
    const parser = new JsonOutputFunctionsParser();

    const schema = localizedSchemas[type];

    if (!schema) throw error(500, { message: 'Invalid type' });

    // Instantiate the ChatOpenAI class
    const model = new ChatOpenAI({ 
        model: env.LLM_MODEL_ID,
        apiKey: env.OPENAI_API_KEY,
        callbacks: [
          {
            handleLLMEnd(output, runId, parentRunId, tags) {
              console.log(type, 'token Usage', output.llmOutput?.tokenUsage.totalTokens);
              tokenUsage.total += output.llmOutput?.tokenUsage.totalTokens || 0;
              tokenUsage[type] = output.llmOutput?.tokenUsage.totalTokens || 0;
              //console.log(JSON.stringify(output.llmOutput?.tokenUsage))
            },
          },
        ]
    });

    const runnable = model
        .bind({
            functions: [ schema ],
            function_call: { name: "extractor" },
        })
        .pipe(parser);


    // Invoke the runnable with an input
    const result = await runnable.invoke([
        //new HumanMessage(data.text),
        new HumanMessage({
          content
        })
    ]) as ReportAnalysis;

    return result;
}



function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const TEST_DATA: ReportAnalysis = {
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
}