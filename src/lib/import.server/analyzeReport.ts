
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
import { error } from '@sveltejs/kit';
import featureDetection from './feature-detection.json';
//import text from './text.json';
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
import signals from './core.signals.json'
import diagnosis from './core.diagnosis.json';
import bodyParts from './core.bodyParts.json';
import jcard from './jcard.reduced.json';
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
    imaging: imaging as FunctionDefinition,
    fhir: fhir as FunctionDefinition

};

let localizedSchemas = updateLanguage(JSON.parse(JSON.stringify(schemas)));

// extend common schemas

(signals.items.properties.test.enum as string[]) = testPropserties.map((item: any) => item[0]);
(featureDetection.parameters.properties.tags.items.enum as string[]) = [...tags, ...signals.items.properties.test.enum];


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
        await sleep(500);
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
}];
