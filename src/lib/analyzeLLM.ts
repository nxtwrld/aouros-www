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

(lab.parameters.properties.results.items.properties.test.enum as string[]) = testPropserties.map((item: any) => item[0]);
(image.parameters.properties.tags.items.enum as string[]) = [...tags, ...lab.parameters.properties.results.items.properties.test.enum];
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

function updateLanguage(schema: { [key: string]: any }, language: string = 'english') {
  for (const key in schema) {
    if (schema[key] instanceof Object) {
      updateLanguage(schema[key]);
    } else {
      if (key === 'description' && typeof schema[key] == 'string') {
        schema[key] = schema[key].replace(/\[LANGUAGE\]/ig,language);
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
    updateLanguage(schemas);

    console.log('Schema updated...', currentLanguage)
  
    //await sleep(500);
    //return Promise.resolve(TEST_DATA);

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

    const schema = schemas[type];

    if (!schema) throw error(500, { message: 'Invalid type' });

    // Instantiate the ChatOpenAI class
    const model = new ChatOpenAI({ 
        model: "gpt-4o",
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
  "text": "LÉKAŘSKÁ ZPRÁVA \n\nPacient: Mašková Andrea Sofie\nBydliště: Na Strži 57, 14000 Praha 4\nTelefon: 773594110\nZařízení: MEDOFTAL s.r.o.\nAdresa: Jabloňová 8, 10600 Praha 10-Záběhlice\n\nDatum: 26.8.2024\n\nRodné číslo: 116103/1355\nPojišťovna: 111\nVěk: 12 let, 9 měsíců\n\nOdbornost: 705\nIČP: 10-346-001\nLékař: MUDr. Jana Syslová\n\nNO: nyní 5. den od ošetření HV OL, nikde nekapal, bylo oteklé, nyní lepší\nOA: 0 AA: 0 OEK: 0\nObl.:\nVOP 1,0 nat.\nVOL 0,9-1,0(-1) nat.\nNO: poh.bpn\nOP: PS klidný, v okrajích víček mírně šupinek, bez zarudnutí, spojivky klidné, R jasná, PK výv. čirá, Z okr. VC, fu-orient. bv\nobl. zad.polu bpn\nOL: na HV uprostřed horních víček, palp.drobně okr. rezistence mírně OOKTO V OL, bez zarudnutí, everze HV spoj. překrvená, bez granulomu, po šetrné palpaci bez expresí, v okrajích víček mírné šupinek, R jasná, PK výv. čirá, Z okr. VC , fu-orient  bpn\n\nZávěr: Chalaseon palp.supp. acutum l.sin.\nTerapie: OL: Tobradex gtt 5xd po 3 dnech 3xd, celk. 7-10 dní a EX studené obklady, poté Blephagel na víčka\n\nKO: při obtížích či zhoršení ihned, jinak podle potřeby Pacient byl poučen, byl mu vysvětlen režim léčby a kontrol, všechny položené otázky byly zodpovězeny.\nPacient odchází ve stabilizovaném stavu. Při výskytu nových obtíží, akutním zhoršení stavu kontaktuje  naší ambulanci, popř. pohotovostní službu.\n\nPředepsané léky: TOBRADEX 3MG/ML+1MG/ML OPH GTT SUS 1X5ML, 0225172 (1x), 5x za den do OL\n\nPodpis: Jana Syslová",
  "tags": [
      "eyes",
      "lower_eyelid",
      "conjunctiva",
      "eyelids"
  ],
  "hasLabOrVitals": false,
  "hasPrescription": true,
  "hasImmunization": false,
  "prescriptions": [
      {
          "name": "Tobradex",
          "dosage": 3,
          "route": "ophthalmic",
          "form": "liquid",
          "days": 10,
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
          ]
      }
  ],
  "report": {
      "category": "exam",
      "observation": "Oční vyšetření",
      "title": "Oční vyšetření - Andrea Sofie Mašková",
      "summary": "Chalaseon palp.supp. acutum l.sin. Začáteční léčba Tobradexem a studenými obklady.",
      "content": "NO: nyní 5. den od ošetření HV OL, nikde nekapal, bylo oteklé, nyní lepší\nOA: 0 AA: 0 OEK: 0\nObl.:\nVOP 1,0 nat.\nVOL 0,9-1,0(-1) nat.\nNO: poh.bpn\nOP: PS klidný, v okrajích víček mírně šupinek, bez zarudnutí, spojivky klidné, R jasná, PK výv. čirá, Z okr. VC, fu-orient. bv\nobl. zad.polu bpn\nOL: na HV uprostřed horních víček, palp.drobně okr. rezistence mírně OOKTO V OL, bez zarudnutí, everze HV spoj. překrvená, bez granulomu, po šetrné palpaci bez expresí, v okrajích víček mírné šupinek, R jasná, PK výv. čirá, Z okr. VC , fu-orient  bpn",
      "recommendations": [
          "KO: při obtížích či zhoršení ihned, jinak podle potřeby",
          "Při výskytu nových obtíží, akutním zhoršení stavu kontaktuje naší ambulanci, popř. pohotovostní službu."
      ],
      "results": [],
      "bodyParts": [
          {
              "identification": "eyelashes",
              "status": "mírně šupinek",
              "diagnosis": "",
              "treatment": "Blephagel na víčka"
          },
          {
              "identification": "eyelashes",
              "status": "spoj. překrvená",
              "diagnosis": "",
              "treatment": ""
          },
          {
              "identification": "eyes",
              "status": "PS klidný",
              "diagnosis": "",
              "treatment": ""
          },
          {
              "identification": "eye_surface",
              "status": "bez zarudnutí",
              "diagnosis": "",
              "treatment": ""
          },
          {
              "identification": "eye_surface",
              "status": "spojivky klidné",
              "diagnosis": "",
              "treatment": ""
          }
      ],
      "date": "2024-08-26",
      "performer": {
          "doctor": "MUDr. Jana Syslová",
          "role": "Lékař",
          "institution": "MEDOFTAL s.r.o.",
          "address": "Jabloňová 8, 10600 Praha 10-Záběhlice"
      },
      "patient": {
          "name": "Andrea Sofie Mašková",
          "gender": "female",
          "identifier": "116103/1355",
          "dob": "2011-10-03"
      }
  },
  "fhir": {
      "type": "report",
      "entry": [
          {
              "resource": {
                  "resourceType": "Patient",
                  "id": "patient-1",
                  "text": {
                      "status": "generated",
                      "div": "<div>Andrea Sofie Mašková, Female, DOB: 2011-10-03, Identifier: 116103/1355, Bydliště: Na Strži 57, 14000 Praha 4</div>"
                  },
                  "identifier": [
                      {
                          "system": "urn:ietf:rfc:3986",
                          "value": "116103/1355"
                      }
                  ],
                  "name": [
                      {
                          "family": "Mašková",
                          "given": [
                              "Andrea",
                              "Sofie"
                          ]
                      }
                  ],
                  "gender": "female",
                  "birthDate": "2011-10-03",
                  "address": [
                      {
                          "line": [
                              "Na Strži 57"
                          ],
                          "city": "Praha",
                          "postalCode": "14000",
                          "district": "Praha 4",
                          "country": "CZ"
                      }
                  ]
              }
          },
          {
              "resource": {
                  "resourceType": "Organization",
                  "id": "organization-1",
                  "text": {
                      "status": "generated",
                      "div": "<div>MEDOFTAL s.r.o., Jabloňová 8, 10600 Praha 10-Záběhlice</div>"
                  },
                  "name": "MEDOFTAL s.r.o.",
                  "address": [
                      {
                          "line": [
                              "Jabloňová 8"
                          ],
                          "city": "Praha",
                          "postalCode": "10600",
                          "district": "Praha 10-Záběhlice",
                          "country": "CZ"
                      }
                  ]
              }
          },
          {
              "resource": {
                  "resourceType": "Performer",
                  "id": "performer-1",
                  "text": {
                      "status": "generated",
                      "div": "<div>MUDr. Jana Syslová, Role: Lékař</div>"
                  },
                  "practitioner": {
                      "reference": "Practitioner/MUDr. Jana Syslová",
                      "display": "MUDr. Jana Syslová"
                  },
                  "role": {
                      "coding": [
                          {
                              "system": "http://terminology.hl7.org/CodeSystem/practitioner-role",
                              "code": "doctor",
                              "display": "Doctor"
                          }
                      ]
                  },
                  "organization": {
                      "reference": "Organization/organization-1",
                      "display": "MEDOFTAL s.r.o."
                  }
              }
          },
          {
              "resource": {
                  "resourceType": "DiagnosticReport",
                  "id": "diagnosticreport-1",
                  "status": "final",
                  "code": {
                      "coding": [
                          {
                              "system": "http://loinc.org",
                              "code": "abo",
                              "display": "Eye examination"
                          }
                      ],
                      "text": "Eye examination - Andrea Sofie Mašková"
                  },
                  "subject": {
                      "reference": "Patient/patient-1"
                  },
                  "effectiveDateTime": "2024-08-26",
                  "performer": [
                      {
                          "reference": "Performer/performer-1"
                      }
                  ],
                  "results": [],
                  "conclusion": "Chalaseon palp.supp. acutum l.sin.",
                  "conclusionCode": [
                      {
                          "coding": [
                              {
                                  "system": "http://snomed.info/sct",
                                  "code": "55990002",
                                  "display": "Acute suppurative chalazion"
                              }
                          ],
                          "text": "Chalaseon palp.supp. acutum l.sin."
                      }
                  ]
              }
          },
          {
              "resource": {
                  "resourceType": "MedicationRequest",
                  "id": "medicationrequest-1",
                  "status": "active",
                  "intent": "order",
                  "medicationCodeableConcept": {
                      "coding": [
                          {
                              "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                              "code": "310798",
                              "display": "Tobradex"
                          }
                      ],
                      "text": "Tobradex 3MG/ML+1MG/ML OPH GTT SUS 1X5ML"
                  },
                  "subject": {
                      "reference": "Patient/patient-1"
                  },
                  "authoredOn": "2024-08-26",
                  "requester": {
                      "reference": "Practitioner/performer-1",
                      "display": "MUDr. Jana Syslová"
                  },
                  "dosageInstruction": [
                      {
                          "text": "5x za den do OL, celk. 7-10 dní",
                          "timing": {
                              "code": {
                                  "coding": [
                                      {
                                          "system": "http://terminology.hl7.org/CodeSystem/v3-TimingEvent",
                                          "code": "5/d",
                                          "display": "5 times per day"
                                      }
                                  ]
                              }
                          },
                          "route": {
                              "coding": [
                                  {
                                      "system": "http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration",
                                      "code": "OPTHAL",
                                      "display": "Ophthalmic"
                                  }
                              ]
                          },
                          "doseAndRate": [
                              {
                                  "type": {
                                      "coding": [
                                          {
                                              "system": "http://terminology.hl7.org/CodeSystem/dose-ratemode",
                                              "code": "ordered",
                                              "display": "Ordered"
                                          }
                                      ]
                                  },
                                  "doseQuantity": {
                                      "value": 0.03,
                                      "unit": "mL",
                                      "system": "http://unitsofmeasure.org",
                                      "code": "mL"
                                  }
                              }
                          ]
                      }
                  ]
              }
          }
      ]
  },
  "tokenUsage": {
      "total": 18014,
      "image": 7111,
      "prescription": 1096,
      "report": 6069,
      "fhir": 3738
  }
}