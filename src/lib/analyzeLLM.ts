import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage } from "@langchain/core/messages";
import type { Extractor } from '$lib/textract';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { decode } from 'base64-arraybuffer'
import crypto from 'crypto';
import image from './image.json';
import report from './report.json';
import lab from './lab.json';
import tags from './tags.json';
import dental from './dental.json';
import prescription from './prescription.json';
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
  dicom = 'dicom',
  fhir = 'fhir'
}

const schemas: {
    [key: string]: Extractor
} = {
    image: image as Extractor,
    report: report as Extractor,
    lab: lab as Extractor,
    dental: dental as Extractor,
    prescription: prescription as Extractor,
    imaging: imaging as Extractor,
    fhir: fhir as Extractor

};

lab.parameters.properties.results.items.properties.test.enum = testPropserties.map((item: any) => item[0]);
image.parameters.properties.tags.items.enum = [...tags, ...lab.parameters.properties.results.items.properties.test.enum];
report.parameters.properties.bodyParts.items.properties.identification.enum = [...tags];
imaging.parameters.properties.bodyParts.items.properties.identification.enum = [...tags];



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
    hasLabOrVitals: boolean;
    report?: any;
    lab?: any;
    text: string;
    imaging?: any;
    prescriptions?: any;
}

export async function analyze(images: string[]): Promise<ReportAnalysis> {

    //await sleep(500);
    //return Promise.resolve(TEST_DATA);

    const content: Content[] = [
      {
          type: 'image_url',
          image_url: {
              url: images[0]
          }
      }
    ];

    // get basic product info
    let data = await evaluate(content, Types.image) as ReportAnalysis;
    if (!data.isMedical) {
      throw error(400, { message: 'Not a medical image' });
    }

    if (data.hasPrescription) {
      const prescription = await evaluate([{
        type: 'text',
        text: data.text
      }], Types.prescription);
      if (prescription.prescriptions.length > 0) {
        data.prescriptions = prescription.prescriptions;
      }
    }


    switch (data.type) {
        case Types.report:
            //data.report = await evaluate(content, Types.report);
            data.report = await evaluate([{
              type: 'text',
              text: data.text
            }], Types.report);


            if (data.hasLabOrVitals && data.type !== Types.lab) {
              const lab = await evaluate([{
                type: 'text',
                text: data.text
              }], Types.lab);
              data.report.results = lab.results;
            }
            break;
        case Types.lab:
            //data.lab = await evaluate(content, Types.lab);
            data.report = await evaluate([{
              type: 'text',
              text: data.text
            }], Types.lab);
            data.report.category = 'lab';
            break;
        case Types.dental:
            data.report = await evaluate([{
              type: 'text',
              text: data.text
            }], Types.dental);
            break;
        case Types.imaging:
          case Types.dicom:
            data.report = await evaluate(content, Types.imaging);
            data.report.category = 'imaging';
            break;
    }

    data.fhir = await evaluate([{
      type: 'text',
      text: JSON.stringify(data)
    }], Types.fhir);


    // return item
    return data;
}



export async function evaluate(content: Content[], type: Types): Promise<ReportAnalysis> {


    // Instantiate the parser
    const parser = new JsonOutputFunctionsParser();

    const schema = schemas[type];
    // Instantiate the ChatOpenAI class
    const model = new ChatOpenAI({ 
        model: "gpt-4o",
        apiKey: env.OPENAI_API_KEY,
        callbacks: [
          {
            handleLLMEnd(output, runId, parentRunId, tags) {
              console.log('Token Usage', output.llmOutput.tokenUsage.totalTokens);
              console.log(JSON.stringify(output.llmOutput.tokenUsage))
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
  "text": "LÉKAŘSKÁ ZPRÁVA\nPacient: Mašková Andrea Sofie\nBydliště: Na Strži 57, 14000 Praha 4\nTelefon: 773594110\nZařízení: MEDOFTAL s.r.o.\nJabloňová 8, 10600 Praha 10-Záběhlice\nTelefon: 267 295 371\nDatum: 26.8.2024 Čas: 09:18\n\nRodné číslo: 116103/1355\nPojišťovna: 111\nVěk: 12 let, 9 měsíců\nOdbornost: 705\nIČP: 10-346-001\nLékař: MUDr Jana Syslová\n\nNO: nyní 5. den otok víček HV OL, nijak nekapali, bylo oteklé, nyní lepší OOE: 0 AA: 0A\nObl.: VOP 1,0 nat.\n VOL 0,9-1,0(-1) nat.\n NOT palp. Tn bíl.\nOP- PS klidný, v okrajích víček mírné šupinek, bez zarudnutí, spoj. klidná, R jasná, PK vtyv. čirá, Z okr. VC, fu-orient. bv\n              obl. zad. polu bpn\n OL- H OV hypertrofie spoj. Falt palp. drobná okr. rezistence mírné ekzoto v ocích, bez zarudnutí, everze HV spoj. překrvéná, bez <il. há h. pokl expresé, v okrajích víček mírné šupinek, R jasná, PK vtyv. čirá, Z okr. , VC, fu- orient. bpn\n Závěr: Chalazeon palp.` sup. acutum l.sin.\n Terapie: OL-Tobradex gtt 5xd po 3 dnech 3xd, celk. 7-10 dnů a EX studené obklady, poté Blefagel na víčka \n Ko: při obtížích či zhoršení hned, jinak podle potřeby Pacient byl poučen, b yl mu vysvětlen režim léčby i kontroly. všechny položené otázky byly zodpovězeny. Pacient odchází ve stabilizovaném stavu. Při výskytu nových obtíží, akutním zhoršení stavu kontaktujte naši ambulanci, v době naší nepřítomnosti provozuje službu oční pohotovostní službou\n Předepsané léky: TOBRADEX 3MG/ML+1MG/ML OPH GTT SUS 1X5ML, 0225172 (1x). 5x za den do OL",
  "tags": [
      "eyes"
  ],
  "hasLabOrVitals": false,
  "hasPrescription": true,
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
      "observation": "LÉKAŘSKÁ ZPRÁVA Pacient: Mašková Andrea Sofie Rodné číslo: 116103/1355 Pojistovna: 111 Věk: 12 let, 9 měsíců Odbornost: 705 NO: nyní 5. den otok víček HV OL, nijak nekapali, bylo oteklé, nyní lepší OOE: 0 AA: 0A Obl.: VOP 1,0 nat. VOL 0,9-1,0(-1) nat. NOT palp. Tn bíl. OP- PS klidný, v okrajích víček mírné šupinek, bez zarudnutí, spoj. klidná, R jasná, PK vtyv. čirá, Z okr. VC, fu-orient. bv obl. zad. polu bpn OL- H OV hypertrofie spoj. Falt palp. drobná okr. rezistence mírné ekzoto v ocích, bez zarudnutí, everze HV spoj. překrvéná, bez <il. há h. pokl expresé, v okrajích víček mírné šupinek, R jasná, PK vtyv. čirá, Z okr. , VC, fu- orient. bpn Závěr: Chalazeon palp.` sup. acutum l.sin. Terapie: OL-Tobradex gtt 5xd po 3 dnech 3xd, celk. 7-10 dnů a EX studené obklady, poté Blefagel na víčka Ko: při obtížích či zhoršení hned, jinak podle potřeby Pacient byl poučen, byl mu vysvětlen režim léčby i kontroly. všechny položené otázky byly zodpovězeny. Pacient odchází ve stabilizovaném stavu. Při výskytu nových obtíží, akutním zhoršení stavu kontaktujte naši ambulanci, v době naší nepřítomnosti provozuje službu oční pohotovostní službou Předepsané léky: TOBRADEX 3MG/ML+1MG/ML OPH GTT SUS 1X5ML, 0225172 (1x). 5x za den do OL",
      "category": "exam",
      "title": "LÉKAŘSKÁ ZPRÁVA",
      "summary": "Nyní 5. den otok víček HV OL, oči nebyly kapány, bylo oteklé, nyní lepší. VOP 1,0 nat. VOL 0,9-1,0(-1) nat. OP- PS klidný, v okrajích víček mírné šupinky, bez zarudnutí, spojivka klidná, R jasná, PK čirá, Z okr. VC, fu-orientovaný, oblast zadního pole bez patologických nálezů. OL- Hypertrofie spojivky. Drobná okr. rezistence, mírné ekzoto v očích, spojivka překrvená v okrajích víček mírné šupinky, R jasná, PK čirá, Z okr. VC, fu-orientovaný, oblast zadního pole bez patologických nálezů. Závěr: Chalazeon palpuje sup. acutum l.sin.",
      "content": "NO: nyní 5. den otok víček HV OL, nijak nekapali, bylo oteklé, nyní lepší \n\nOOE: 0 AA: 0A \n\nObl.: VOP 1,0 nat. VOL 0,9-1,0(-1) nat. NOT palp. Tn bíl. \n\nOP- PS klidný, v okrajích víček mírné šupinek, bez zarudnutí, spoj. klidná, R jasná, PK vtyv. čirá, Z okr. VC, fu-orient. bv \nobl. zad. polu bpn OL- H OV hypertrofie spoj. Falt palp. drobná okr. rezistence mírné ekzoto v ocích, bez zarudnutí, everze HV spoj. překrvéná, bez <il. há h. pokl expresé, v okrajích víček mírné šupinek, R jasná, PK vtyv. čirá, Z okr. , VC, fu- orient. bpn \n\nZávěr: Chalazeon palp.` sup. acutum l.sin.",
      "recommendations": [
          "OL-Tobradex gtt 5x denně po 3 dnech 3x denně, celkem 7-10 dnů",
          "EX studené obklady, poté Blefagel na víčka",
          "Kontrola při obtížích či zhoršení hned, jinak podle potřeby"
      ],
      "results": [],
      "bodyParts": [
          {
              "identification": "eyelashes",
              "status": "otok",
              "diagnosis": "bez zarudnutí",
              "treatment": "Blefagel"
          },
          {
              "identification": "eyes",
              "status": "hypertrofie",
              "diagnosis": "Chalazeon palp.` sup. acutum l.sin.",
              "treatment": "OL-Tobradex gtt"
          }
      ],
      "date": "2024-08-26 09:18:00",
      "performer": {
          "doctor": "MUDr Jana Syslová",
          "institution": "MEDOFTAL s.r.o.",
          "address": "Jabloňová 8, 10600 Praha 10-Záběhlice"
      },
      "patient": {
          "name": "Mašková Andrea Sofie",
          "gender": "female",
          "identifier": "116103/1355",
          "dob": "2011-10-03"
      }
  }
}