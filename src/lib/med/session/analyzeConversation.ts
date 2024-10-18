import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage } from "@langchain/core/messages";
import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
import { transcribeAudio } from "$slib/audio/assemblyai";
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import diagnosis from './diagnosis.json';
import tags from '../../reportImports/tags.json';
//import { extractText } from "./gemini";
import testPropserties from '$data/lab.synonyms.json';
import { fetchGpt } from '$slib/ai/gpt';
import { type Content, type TokenUsage } from '$slib/ai/types.d';
/**
 * TODO:
 * - Add support for multiple images
 * - Optimize token usage - test gemini text extration
 * - gtp-4o (7k) vs gpt-4o-mini (40k)
 */

export interface Analysis {
    tokenUsage: TokenUsage;
    conversation: {
        speaker: string;
        text: string;
    }[];
    complaint: string;
    diagnosis: {
        name: string;
        origin: string;
        basis: string;
        probability: number;
    }[];
    counterMeassures: {
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
enum Types {
    diagnosis = 'diagnosis'
}



type Input = {
    audio?: string[];
    text?: string;
    language?: string;
};




const schemas: {
    [key: string]: FunctionDefinition
} = {
    diagnosis: diagnosis as FunctionDefinition

};

let localizedSchemas = updateLanguage(JSON.parse(JSON.stringify(schemas)));

// extend common schemas


(diagnosis.parameters.properties.symptoms.items.properties.bodyParts.items.enum as string[]) = [...tags];





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


export async function analyze(input : Input): Promise<Analysis> {

    const tokenUsage : TokenUsage = {
      total: 0
    };

    const currentLanguage = input.language || 'English';

    localizedSchemas = updateLanguage(JSON.parse(JSON.stringify(schemas)), currentLanguage);

    console.log('Schema updated...', typeof input.text)
  
    await sleep(500);
    return Promise.resolve(TEST_DATA[Math.floor(Math.random() * TEST_DATA.length)]);

    // get basic item info
    let data = await evaluate([{
        type: 'text',
        text: input.text
    }] , Types.diagnosis, tokenUsage) as Analysis;
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




export async function evaluate(content: Content[], type: Types, tokenUsage: TokenUsage): Promise<ReportAnalysis> {


  const schema = localizedSchemas[type];

  if (!schema) error(500, { message: 'Invalid type' });


  return await fetchGpt(content, schema, tokenUsage) as ReportAnalysis;;
}




function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


const TEST_DATA = [{
  "conversation": [
      {
          "speaker": "patient",
          "text": "Dobrý den, pane doktore. Mám bolesti v krku a horečku."
      },
      {
          "speaker": "doctor",
          "text": "Co mi můžete doporučit?"
      },
      {
          "speaker": "doctor",
          "text": "Od kdy pociťujete bolesti? Jak dlouho trvá horečka? Máte nějaké další příznaky?"
      },
      {
          "speaker": "patient",
          "text": "Nemohu polykat a mám bolesti hlavy už několik dní. Měřil jsem se předevčírem, když mi bylo už hodně blbě a měl jsem třicet sedm devět."
      },
      {
          "speaker": "patient",
          "text": "To už trochu polevilo, ale stále se necítím dobře. Teplota je stále vysoká a mám pocit, že se mi zhoršuje zrak."
      },
      {
          "speaker": "doctor",
          "text": "Tak se změříme teď hned. Vydržte mi."
      },
      {
          "speaker": "doctor",
          "text": "Třicet sedm šest. To je dost. Ukažte mi jazyk."
      },
      {
          "speaker": "doctor",
          "text": "Máte na něm bílý povlak."
      }
  ],
  "symptoms": [
      {
          "name": "bolest v krku",
          "duration": "days",
          "severity": "moderate",
          "bodyParts": [
              "throat"
          ]
      },
      {
          "name": "horečka",
          "duration": "days",
          "severity": "moderate",
          "bodyParts": [
              "body"
          ]
      },
      {
          "name": "bolesti hlavy",
          "duration": "days",
          "severity": "moderate",
          "bodyParts": [
              "head"
          ]
      },
      {
          "name": "zhoršený zrak",
          "duration": "days",
          "severity": "mild",
          "bodyParts": [
              "eyes"
          ]
      },
      {
          "name": "bílý povlak na jazyku",
          "duration": "days",
          "severity": "moderate",
          "bodyParts": [
              "mouth"
          ]
      }
  ],
  "complaint": "Bolest v krku a horečka",
  "diagnosis": [
      {
          "name": "zánět hltanu",
          "origin": "symptoms",
          "basis": "bolest v krku, bílý povlak na jazyku, horečka",
          "probability": 0.75
      },
      {
          "name": "angína",
          "origin": "symptoms",
          "basis": "bolest v krku, bílý povlak na jazyku, horečka",
          "probability": 0.6
      }
  ],
  "counterMeassures": [
      {
          "description": "vyhýbat se chlazeným nápojům a ledovým potravinám",
          "origin": "specialist"
      },
      {
          "description": "zůstat doma v teple a hodně pít",
          "origin": "specialist"
      }
  ],
  "followUp": [
      {
          "type": "specialist",
          "name": "ORL specialista",
          "reason": "přetrvávající bolest v krku a horečka",
          "origin": "symptoms"
      }
  ],
  "medication": [
      {
          "name": "paracetamol",
          "dosage": 500,
          "days": "5-7 days",
          "days_of_week": [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday"
          ],
          "time_of_day": "každých 6 hodin",
          "origin": "specialist"
      }
  ],
  "tokenUsage": {
      "total": 5965,
      "You a medical professional assistent. You have transcript of doctor patient conversation and you provide deailed assessment of the conversation. We want to extract symptoms and diagnosis and potentially suggest alternatives. Provide all answers in czech language.": 5965
  }
},  {
    "conversation": [
        {
            "speaker": "patient",
            "text": "Dobrý den, pane doktore. Mám bolesti v krku a horečku. Co mi můžete doporučit?"
        },
        {
            "speaker": "doctor",
            "text": "Od kdy pociťujete bolesti? Jak dlouho trvá horečka? Máte nějaké další příznaky?"
        },
        {
            "speaker": "patient",
            "text": "Nemohu polykat a mám bolesti hlavy už několik dní. Měřil jsem se předevčírem, když mi bylo už hodně špatně a měl jsem třicet sedm devět. To už trochu polevilo, ale stále se necítím dobře. Teplota je stále vysoká a mám pocit, že se mi zhoršuje zrak."
        },
        {
            "speaker": "nurse",
            "text": "Tak se změříme teď hned. Vydržte mi."
        },
        {
            "speaker": "nurse",
            "text": "Třicet sedm šest. To je dost."
        },
        {
            "speaker": "doctor",
            "text": "Ukažte mi jazyk. Máte na něm bílý povlak."
        }
    ],
    "symptoms": [
        {
            "name": "bolest v krku",
            "duration": "days",
            "severity": "moderate",
            "bodyParts": [
                "throat"
            ]
        },
        {
            "name": "horečka",
            "duration": "days",
            "severity": "moderate",
            "bodyParts": [
                "body"
            ]
        },
        {
            "name": "bolest při polykání",
            "duration": "days",
            "severity": "moderate",
            "bodyParts": [
                "throat"
            ]
        },
        {
            "name": "bolest hlavy",
            "duration": "days",
            "severity": "moderate",
            "bodyParts": [
                "skull"
            ]
        },
        {
            "name": "zhoršení zraku",
            "duration": "days",
            "severity": "moderate",
            "bodyParts": [
                "eyes"
            ]
        },
        {
            "name": "bílý povlak na jazyku",
            "duration": "days",
            "severity": "mild",
            "bodyParts": [
                "tongue"
            ]
        }
    ],
    "complaint": "Bolest v krku a horečka.",
    "diagnosis": [
        {
            "name": "bakteriální tonzilitida",
            "origin": "symptoms",
            "basis": "Bolest v krku a bílý povlak na jazyku.",
            "probability": 0.8
        },
        {
            "name": "virová infekce",
            "origin": "symptoms",
            "basis": "Horečka a celková slabost.",
            "probability": 0.6
        }
    ],
    "counterMeassures": [
        {
            "description": "Zajistit dostatečný příjem tekutin a odpočinek.",
            "origin": "symptoms"
        },
        {
            "description": "Vyhýbat se dráždivým jídlům a nápojům, které mohou zhoršovat bolest v krku.",
            "origin": "symptoms"
        }
    ],
    "followUp": [
        {
            "type": "test",
            "name": "výtěr z krku",
            "reason": "Potvrzení bakteriální infekce.",
            "origin": "symptoms"
        },
        {
            "type": "specialist",
            "name": "ORL specialista",
            "reason": "Přetrvávající bolesti v krku a zhoršení zraku.",
            "origin": "symptoms"
        }
    ],
    "medication": [
        {
            "name": "Paracetamol",
            "dosage": 500,
            "days": "3-5 days",
            "days_of_week": [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday"
            ],
            "time_of_day": "ráno a večer",
            "origin": "symptoms"
        }
    ],
    "tokenUsage": {
        "total": 6011,
        "You a medical professional assistent. You have transcript of doctor patient conversation and you provide deailed assessment of the conversation. We want to extract symptoms and diagnosis and potentially suggest alternatives. Provide all answers in czech language.": 6011
    }
}
]

