
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
    
    data.text = input.text || ''

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
        data.tags = [...new Set(data.tags.concat(data.report.bodyParts.map((item: any) => item.identification)))];
    }

    if (data.report.signals) {
        data.report.signals = data.report.signals.map((item: any) => {
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
    "type": Types.report,
    "fhirType": "DiagnosticReport",
    "fhir": {},
    "cagegory": "report",
    "tags": [
        "esophagus",
        "throat",
        "larynx",
        "hyoid_bone_skeletal",
        "nerves"
    ],
    "hasLabOrVitals": false,
    "hasPrescription": true,
    "hasImmunization": false,
    "text": "Fakultní Thomayerova nemocnice\nIČ: 00064190\nVídeňská 800, 140 59 Praha 4 Krč\n\nOddělení ORL a chirurgie hlavy a krku\nPřednosta: MUDr. Aleš Čoček, Ph.D. Dr. med.\nORL oddělení - ambulance ORL\n\nORL vyšetření\n\nPacient: Mašková Irena\nBydliště: Severní IV 614/13, Praha 4, 140 00\nDatum vyšetření: 30.01.2023, 8.19\n\nIdent.č.: 485811033\nDatum narození: 11.8.1948\nPohlaví: žena\n\nPoj.: 111\n\nNález:\nNO: 12.1.23 vyšetřena pro týden postupně narůstající odynofagie, s bolestmi v krku, polykání přes bolesti volné, afonie úplná, hlas jasný, afebrilní. Přeléčena herpesiin, při nausea užívala helicid.\nNyní bolesti při polykání nejsou, přetrvává dráždění ke kašli přes den, ale nastydlá se necítí.\nOA: aHT, artroso\nFA: antihypertenziva\n\nobj.\npalp. na krku bez rezistence, fce n.VII zachovalá, výstup n.V palp. nebol.\noro- sliznice úklidné, jazyk nepovleklý, pláty středem, vývody slinných žlaz klidné, slina čirá, tonsily klidné, bez sekretu.\nlaryngo (opt.)- hrtan faryng. oblouk vlevo, velká asymetrická obsahuje štíhlá, hladké, sym. pohyb.vé leukoplakii, vlevo hyposinský - infiltrát sliznice piriformní sínů zhyper.s infiltrát.\n\nZáv: Asymetrická hypertrofie L arytenoidní oblasti s přechodem do pirif. sinu, zaléčen aftosní infekt, s regresí, ne však zcela upravením nálezu.\n\nDop: Helcid 20mg 1-0-1. Platí termín k MLS a esofgoskopii s probat. excisemi na 10.2.23, příjem 9.2. Seznam předoper. vyš. vydán.\nPřeoper. anesteziol. vyš. 8.2.23 v 9 hod (pac. G6)\nEndoskopické výkony provedeny pomocí videofečetězce.\n\nDiagnózy epizody:\nJ060 - Akutní zánět hltanu i hrtanu - laryngopharyngitis acuta\n\nMUDr. Ludmila Vylečková,\nV Praze, 30.1.2023\n\nTisk: 30.01.2023 08:19\n\nStrana: 1 / 1",
    "report": {
        "category": "exam",
        "title": "Vyšetření ORL s asymetrickou hypertrofií v oblasti arytenoidů",
        "summary": "Pacientka podstoupila ORL vyšetření pro potíže s bolesti v krku a odynofagii. Byla léčena herpesiinem a helicidem kvůli dávivosti. Bolesti při polykání ustoupily, ale přetrvává dráždění ke kašli. Byl zjištěn zánět hltanu a hrtanu s asymetrickou hypertrofií v levé arytenoidní oblasti. Doporučeno další endoskopické vyšetření a probatologické excise.",
        "content": "**Fakultní Thomayerova nemocnice**  \nIČ: 00064190  \nVídeňská 800, 140 59 Praha 4 Krč  \n\n**Oddělení ORL a chirurgie hlavy a krku**  \nPřednosta: MUDr. Aleš Čoček, Ph.D. Dr. med.  \nORL oddělení - ambulance ORL  \n\n# ORL vyšetření  \n\n**Pacient:** Mašková Irena  \n**Datum vyšetření:** 30.01.2023, 8.19  \n\nNález:  \nNO: 12.1.23 vyšetřena pro týden postupně narůstající odynofagie, s bolestmi v krku, polykání přes bolesti volné, afonie úplná, hlas jasný, afebrilní. Přeléčena herpesiin, při nausea užívala helicid.  \nNyní bolesti při polykání nejsou, přetrvává dráždění ke kašli přes den, ale nastydlá se necítí.  \nOA: aHT, artroso  \nFA: antihypertenziva  \n\nobj.  \npalp. na krku bez rezistence, fce n.VII zachovalá, výstup n.V palp. nebol.  \noro- sliznice úklidné, jazyk nepovleklý, pláty středem, vývody slinných žlaz klidné, slina čirá, tonsily klidné, bez sekretu.  \nlaryngo (opt.)- hrtan faryng. oblouk vlevo, velká asymetrická obsahuje štíhlá, hladké, sym. pohyb.vé leukoplakii, vlevo hyposinský - infiltrát sliznice piriformní sínů zhyper.s infiltrát.  \n\nZáv: Asymetrická hypertrofie L arytenoidní oblasti s přechodem do pirif. sinu, zaléčen aftosní infekt, s regresí, ne však zcela upravením nálezu.  \n\nDop: Helcid 20mg 1-0-1. Platí termín k MLS a esofgoskopii s probat. excisemi na 10.2.23, příjem 9.2. Seznam předoper. vyš. vydán.  \nPřeoper. anesteziol. vyš. 8.2.23 v 9 hod (pac. G6)  \nEndoskopické výkony provedeny pomocí videofečetězce.  \n\nDiagnózy epizody:  \nJ060 - Akutní zánět hltanu i hrtanu - laryngopharyngitis acuta  \n\nMUDr. Ludmila Vylečková,  \nV Praze, 30.1.2023  \n\nTisk: 30.01.2023 08:19  \n\nStrana: 1 / 1",
        "localizedContent": "**Fakultní Thomayerova nemocnice**  \nIČ: 00064190  \nVídeňská 800, 140 59 Praha 4 Krč  \n\n**Oddělení ORL a chirurgie hlavy a krku**  \nPřednosta: MUDr. Aleš Čoček, Ph.D. Dr. med.  \nORL oddělení - ambulance ORL  \n\n# ORL vyšetření  \n\n**Pacient:** Mašková Irena  \n**Datum vyšetření:** 30.01.2023, 8.19  \n\nNález:  \nNO: 12.1.23 vyšetřena pro týden postupně narůstající odynofagie, s bolestmi v krku, polykání přes bolesti volné, afonie úplná, hlas jasný, afebrilní. Přeléčena herpesiin, při nausea užívala helicid.  \nNyní bolesti při polykání nejsou, přetrvává dráždění ke kašli přes den, ale nastydlá se necítí.  \nOA: aHT, artroso  \nFA: antihypertenziva  \n\nobj.  \npalp. na krku bez rezistence, fce n.VII zachovalá, výstup n.V palp. nebol.  \noro- sliznice úklidné, jazyk nepovleklý, pláty středem, vývody slinných žlaz klidné, slina čirá, tonsily klidné, bez sekretu.  \nlaryngo (opt.)- hrtan faryng. oblouk vlevo, velká asymetrická obsahuje štíhlá, hladké, sym. pohyb.vé leukoplakii, vlevo hyposinský - infiltrát sliznice piriformní sínů zhyper.s infiltrát.  \n\nZáv: Asymetrická hypertrofie L arytenoidní oblasti s přechodem do pirif. sinu, zaléčen aftosní infekt, s regresí, ne však zcela upravením nálezu.  \n\nDop: Helcid 20mg 1-0-1. Platí termín k MLS a esofgoskopii s probat. excisemi na 10.2.23, příjem 9.2. Seznam předoper. vyš. vydán.  \nPřeoper. anesteziol. vyš. 8.2.23 v 9 hod (pac. G6)  \nEndoskopické výkony provedeny pomocí videofečetězce.  \n\nDiagnózy epizody:  \nJ060 - Akutní zánět hltanu i hrtanu - laryngopharyngitis acuta  \n\nMUDr. Ludmila Vylečková,  \nV Praze, 30.1.2023  \n\nTisk: 30.01.2023 08:19  \n\nStrana: 1 / 1",
        "recommendations": [
            {
                "urgency": 3,
                "description": "Doporučeno užívání přípravku Helcid 20mg 1-0-1."
            },
            {
                "urgency": 4,
                "description": "Dodržet termíny pro MLS a ezofagoskopii s probatorní excisí na 10.2.23, s příjmem 9.2."
            },
            {
                "urgency": 3,
                "description": "Podstoupit předoperační anesteziologické vyšetření 8.2.23 v 9:00."
            }
        ],
        "date": "2023-01-30",
        "performer": {
            "adr": [
                {
                    "street-address": [
                        "Vídeňská 800"
                    ],
                    "locality": [
                        "Praha 4"
                    ],
                    "postal-code": [
                        "140 59"
                    ],
                    "country-name": [
                        "Česká republika"
                    ]
                }
            ],
            "email": [
                {
                    "value": "orlkrc@example.com"
                }
            ],
            "fn": "MUDr. Ludmila Vylečková",
            "n": {
                "family-name": [
                    "Vylečková"
                ],
                "given-name": [
                    "Ludmila"
                ]
            },
            "org": [
                {
                    "organization-name": "Fakultní Thomayerova nemocnice",
                    "organization-unit": [
                        "Oddělení ORL a chirurgie hlavy a krku"
                    ]
                }
            ],
            "role": [
                "Lékař"
            ],
            "tel": [
                {
                    "value": "+420261083111"
                }
            ],
            "title": [
                "ORL specialista"
            ]
        },
        "patient": {
            "fullName": "Mašková Irena",
            "biologicalSex": "female",
            "identifier": "485811033",
            "birthDate": "1948-08-11",
            "insurance": {
                "provider": "111"
            }
        },
        "diagnosis": {
            "code": "J060",
            "description": "Akutní zánět hltanu i hrtanu - laryngofaryngitida akutní"
        },
        "bodyParts": [
            {
                "identification": "larynx",
                "status": "Asymetrická hypertrofie L arytenoidní oblasti s přechodem do piriformního sinu, zaléčen aftózní infekt s regresí, ale s neúplným upravením nálezu.",
                "treatment": "Užívání přípravku Helcid a plánovaná MLS a ezofagoskopie s probatorními excisemi.",
                "urgency": 3
            }
        ]
    },
    "tokenUsage": {
        "total": 16141,
        "Proceed step by step. Identify the contents of the provided JSON  input. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical.   All results should be in Czech language, except for contents which is in the original language of the report.": 6221,
        "Proceed ste by step. From the medication record, extract the following information. If it is not a medication record, mark it as isMedication as false.": 1176,
        "You are medical expert data analyzer. Proceed step by step. Identify the content of the image. We are analyzing medical data, if it is not medical report, lab results of medical imaging, mark it as notMedical. With each section provide only iformation contained in the document. For dates, if only a year is known, just list the year without day or month.  All results should be translated to Czech language, except for 'content' field that keeps the original language of the document.": 8744
    }
}];
