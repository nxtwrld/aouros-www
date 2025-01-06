
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
import { error } from '@sveltejs/kit';
import transcript from '$lib/session/session.transcript';
import diagnosis from '$lib/configurations/session.diagnosis';
import tags from '$lib/configurations/tags';
import propertiesDefition from '$data/lab.properties.defaults.json';
import { fetchGpt } from '$lib/ai/gpt';
import { type Content, type TokenUsage } from '$lib/ai/types.d';
import signals from '$lib/configurations/core.signals'
import { updateLanguage } from "$lib/ai/schema";
import { sleep } from "$lib/utils";
import { ANALYZE_STEPS as Types } from '$lib/types.d';
import { env } from '$env/dynamic/private';


const DEBUG = env.DEBUG_CONVERSATION  === 'true';
/**
 * TODO:
 * - gtp-4o (7k) vs gpt-4o-mini (40k) -
 * - test multi-model setups for GP, PT, etc. medical configurations.
 */




export interface Analysis {
    tokenUsage: TokenUsage;
    conversation: {
        speaker: string;
        text: string;
    }[];
    complaint: string;
    results: {

    }[];
    diagnosis: {
        name: string;
        origin: string;
        basis: string;
        probability: number;
    }[];
    treatment: {
        description: string;
        origin: string;
    }[];
    followUp: {
        type: string;
        name: string;
        reason: string;
        origin: string;
    }[];
    medication: {
        name: string;
        dosage: number;
        days: string;
        days_of_week: string[];
        time_of_day: string;
        origin: string;
    }[];

    
}




type Input = {
    audio?: string[];
    text?: string;
    type: Types;
    language?: string;
};


(signals.items.properties.signal.enum as string[]) = Object.keys(propertiesDefition);
diagnosis.parameters.properties.signals = signals;



const schemas: {
    [key: string]: FunctionDefinition
} = {
    diagnosis: diagnosis as FunctionDefinition,
    transcript: transcript as FunctionDefinition

};

let localizedSchemas = updateLanguage(JSON.parse(JSON.stringify(schemas)));

// extend common schemas


(transcript.parameters.properties.symptoms.items.properties.bodyParts.items.enum as string[]) = [...tags];






export async function analyze(input : Input): Promise<Analysis> {

    const tokenUsage : TokenUsage = {
      total: 0
    };

    const currentLanguage = input.language || 'English';

    localizedSchemas = updateLanguage(JSON.parse(JSON.stringify(schemas)), currentLanguage);


    console.log('Schema updated...', input.type)
  
    if (DEBUG) {
        await sleep(1500);
        return Promise.resolve(TEST_DATA[input.type][Math.floor(Math.random() * TEST_DATA[input.type].length)]);
    }

    console.log('evaluating...')
    // get basic item info
    let data = await evaluate([{
        type: 'text',
        text: input.text
    }] , input.type, tokenUsage) as Analysis;
    console.log('input assesed...');

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




export async function evaluate(content: Content[], type: Types, tokenUsage: TokenUsage): Promise<Analysis> {


  const schema = localizedSchemas[type];
  console.log('Schema', type)

  if (!schema) error(500, { message: 'Invalid type ' + type });


  return await fetchGpt(content, schema, tokenUsage) as Analysis;;
}







const TEST_DATA = {
    transcript: [{
        "conversation": [
            {
                "speaker": "patient",
                "text": "Dobrý den, pane doktore. Mám bolesti v krku a horečku.",
                "stress": "medium",
                "urgency": "medium"
            },
            {
                "speaker": "doctor",
                "text": "Co mi můžete doporučit?",
                "stress": "low",
                "urgency": "medium"
            },
            {
                "speaker": "doctor",
                "text": "Od kdy pociťujete bolesti? Jak dlouho trvá horečka? Máte nějaké další příznaky?",
                "stress": "low",
                "urgency": "high"
            },
            {
                "speaker": "patient",
                "text": "Nemohu polykat a mám bolesti hlavy už několik dní. Měřil jsem se předevčírem, když mi bylo už hodně špatně a měl jsem třicet sedm devět.",
                "stress": "high",
                "urgency": "high"
            },
            {
                "speaker": "patient",
                "text": "To už trochu polevilo, ale stále se necítím dobře. Teplota je stále vysoká a mám pocit, že se mi zhoršuje zrak.",
                "stress": "high",
                "urgency": "high"
            },
            {
                "speaker": "nurse",
                "text": "Tak se změříme teď hned. Vydržte mi.",
                "stress": "low",
                "urgency": "medium"
            },
            {
                "speaker": "nurse",
                "text": "Třicet sedm šest. To je dost. Ukažte mi jazyk.",
                "stress": "medium",
                "urgency": "medium"
            },
            {
                "speaker": "doctor",
                "text": "Máte na něm bílý povlak. To vypadá na angínu. Počkejte chvíli, ještě vám vezmu tlak.",
                "stress": "low",
                "urgency": "medium"
            },
            {
                "speaker": "patient",
                "text": "Máme se svléknout?",
                "stress": "medium",
                "urgency": "low"
            },
            {
                "speaker": "nurse",
                "text": "Ne to je zbytečný, stačí, když si vyhrnete rukáv.",
                "stress": "low",
                "urgency": "low"
            },
            {
                "speaker": "patient",
                "text": "Jasně.",
                "stress": "low",
                "urgency": "low"
            },
            {
                "speaker": "nurse",
                "text": "Sto dvacet sedm na osmdesát. To je v pořádku.",
                "stress": "low",
                "urgency": "low"
            },
            {
                "speaker": "doctor",
                "text": "Máte zánět hltanu a angínu. Dostanete antibiotika a budete muset zůstat doma.",
                "stress": "medium",
                "urgency": "medium"
            },
            {
                "speaker": "patient",
                "text": "Dobře, děkuji. A co s tím zrakem?",
                "stress": "medium",
                "urgency": "medium"
            },
            {
                "speaker": "doctor",
                "text": "To je zřejmě způsobeno horečkou. Po vyléčení by to mělo ustoupit. Pokud ne, tak se vraťte.",
                "stress": "low",
                "urgency": "medium"
            },
            {
                "speaker": "doctor",
                "text": "Doporučuji vám také hodně pít a odpočívat a předepíšu vám aspirin. Máte nějaké otázky?",
                "stress": "low",
                "urgency": "medium"
            },
            {
                "speaker": "patient",
                "text": "Asi teď ne.",
                "stress": "low",
                "urgency": "low"
            },
            {
                "speaker": "doctor",
                "text": "Kdyby se to zhoršilo, tak se hned vraťte. Případně mě můžete kontaktovat telefonicky. Když se to nezlepší do týdne, tak se vraťte.",
                "stress": "medium",
                "urgency": "high"
            },
            {
                "speaker": "patient",
                "text": "Tak. Jo. Děkuji. Na shledanou.",
                "stress": "low",
                "urgency": "low"
            },
            {
                "speaker": "doctor",
                "text": "Na shledanou.",
                "stress": "low",
                "urgency": "low"
            }
        ],
        "symptoms": [
            {
                "name": "Bolest v krku",
                "duration": "days",
                "severity": "moderate",
                "bodyParts": [
                    "throat"
                ]
            },
            {
                "name": "Horečka",
                "duration": "days",
                "severity": "severe",
                "bodyParts": [
                    "body"
                ]
            },
            {
                "name": "Bolest hlavy",
                "duration": "days",
                "severity": "moderate",
                "bodyParts": [
                    "head"
                ]
            },
            {
                "name": "Problémy s polykáním",
                "duration": "days",
                "severity": "moderate",
                "bodyParts": [
                    "throat"
                ]
            },
            {
                "name": "Zhoršený zrak",
                "duration": "days",
                "severity": "mild",
                "bodyParts": [
                    "eyes"
                ]
            }
        ],
        "complaint": "Pacient má zánět hltanu a angínu, což způsobuje bolest v krku, horečku a problémy s polykáním. Má také bolesti hlavy a mírné zhoršení zraku, pravděpodobně kvůli horečce.",
        "tokenUsage": {
            "total": 3251,
            "You are aprofessional medical assistent. Your input is a JSON  with doctor/patient conversation and extracted symptoms. Your task is to extract any diagnosis, treatment, medication mentioned by the doctor and potentially suggest alternatives. All information mentioned by the doctor should have the origin set to DOCTOR. Provide all answers in [LANGUAGE] language.": 3251
        }
        
    }],
    diagnosis: [{
        "diagnosis": [
            {
                "name": "Angína",
                "code": "J03.9",
                "origin": "doctor",
                "basis": "bílé povlaky na jazyku, horečka, bolest v krku",
                "probability": 0.9
            },
            {
                "name": "Zánět hltanu",
                "code": "J02.9",
                "origin": "doctor",
                "basis": "bílé povlaky na jazyku, horečka, bolest v krku",
                "probability": 0.9
            }
        ],
        "treatment": [
            {
                "description": "Zůstat doma, odpočívat a hodně pít tekutiny",
                "origin": "doctor"
            },
            {
                "description": "Užívat antibiotika k léčbě angíny a zánětu hltanu",
                "origin": "doctor"
            },
            {
                "description": "Užívat aspirin pro snížení horečky",
                "origin": "doctor"
            }
        ],
        "followUp": [
            {
                "type": "doctor",
                "name": "Oční lékař",
                "reason": "Pokud zrakové potíže po vyléčení neustoupí, je potřeba konzultace s očním specialistou",
                "origin": "doctor"
            }
        ],
        "medication": [
            {
                "name": "Antibiotics",
                "dosage": 500,
                "days": "7-10 days",
                "days_of_week": [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday"
                ],
                "time_of_day": "ráno a večer",
                "origin": "doctor"
            },
            {
                "name": "Aspirin",
                "dosage": 300,
                "days": "3-5 days",
                "days_of_week": [
                    "Monday",
                    "Tuesday",
                    "Wednesday"
                ],
                "time_of_day": "po jídle",
                "origin": "doctor"
            }
        ],
        "signals": [
            {
                "signal": "temperature",
                "value": "37.6",
                "unit": "°C",
                "reference": "36.1-37.2",
                "urgency": 3,
                "date": ""
            },
            {
                "signal": "systolic",
                "value": "127",
                "unit": "mmHg",
                "reference": "90-120",
                "urgency": 1,
                "date": ""
            },
            {
                "signal": "diastolic",
                "value": "80",
                "unit": "mmHg",
                "reference": "60-80",
                "urgency": 1,
                "date": ""
            }
        ]
    }]
}