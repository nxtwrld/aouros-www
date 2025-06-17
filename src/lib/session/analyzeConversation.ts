import type { FunctionDefinition } from "@langchain/core/dist/language_models/base";
import { error } from '@sveltejs/kit';
import transcript from '$lib/session/session.transcript';
import { DIAGNOSIS_CONFIGS } from '$lib/configurations/session.diagnosis';
import tags from '$lib/configurations/tags';
import propertiesDefition from '$data/lab.properties.defaults.json';
import { fetchGpt } from '$lib/ai/gpt';
import { type Content, type TokenUsage } from '$lib/ai/types.d';
import signals from '$lib/configurations/core.signals'
import { updateLanguage } from "$lib/ai/schema";
import { sleep } from "$lib/utils";
import { ANALYZE_STEPS as Types } from '$lib/types.d';
import { env } from '$env/dynamic/private';

// Select diagnosis configuration based on environment variable
const PROMPT_CONFIG = 'enhanced'; // or 'fast' or 'enhanced'
const diagnosis = DIAGNOSIS_CONFIGS[PROMPT_CONFIG as keyof typeof DIAGNOSIS_CONFIGS] || DIAGNOSIS_CONFIGS.enhanced;

console.log(`🧠 Using ${PROMPT_CONFIG} prompt configuration`);

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
        id?: string;
        name: string;
        origin: string;
        basis: string;
        probability: number;
        supportingSymptoms?: string[];
        rationale?: string;
        code?: string;
    }[];
    treatment: {
        id?: string;
        description: string;
        origin: string;
        targetDiagnosis?: string[];
        effectiveness?: string;
    }[];
    followUp: {
        id?: string;
        type: string;
        name: string;
        reason: string;
        origin: string;
        urgency?: string;
    }[];
    medication: {
        id?: string;
        name: string;
        dosage: number;
        days: string;
        days_of_week: string[];
        time_of_day: string;
        origin: string;
        purpose?: string;
        alternatives?: string[];
    }[];
    clarifyingQuestions?: {
        id?: string;
        question: string;
        category?: string;
        intent?: string;
        priority?: string;
        relatedItems?: string[];
        rationale?: string;
        timeframe?: string;
    }[];
    doctorRecommendations?: {
        id?: string;
        recommendation: string;
        category?: string;
        priority?: string;
        timeframe?: string;
        rationale?: string;
        implementation?: string;
        expectedOutcome?: string;
        alternatives?: string[];
    }[];
    signals?: any[];
}




type Input = {
    audio?: string[];
    text?: string;
    type: Types;
    language?: string;
    previousAnalysis?: Partial<Analysis>; // Add previous context for gradual refinement
};


(signals.items.properties.signal.enum as string[]) = Object.keys(propertiesDefition);
// Only add signals to diagnosis schema if it has the signals property
if (diagnosis.parameters?.properties && 'signals' in diagnosis.parameters.properties) {
    diagnosis.parameters.properties.signals = signals;
}

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

    console.log('🌐 Analysis Language Settings:', {
        inputLanguage: input.language,
        currentLanguage: currentLanguage,
        type: input.type,
        hasPreviousAnalysis: !!input.previousAnalysis
    });

    // Create enhanced content with previous context
    let analysisText = input.text || '';
    if (input.previousAnalysis && input.type === Types.diagnosis) {
        const contextSummary = createPreviousContextSummary(input.previousAnalysis);
        analysisText = contextSummary + analysisText;
        console.log('🔄 Added previous context to analysis:', contextSummary.substring(0, 200) + '...');
    }

    localizedSchemas = updateLanguage(JSON.parse(JSON.stringify(schemas)), currentLanguage);

    // Log the updated schema description to verify language replacement
    const schemaKey = input.type;
    if (localizedSchemas[schemaKey]) {
        console.log('🔍 Schema language check:', {
            schemaType: schemaKey,
            originalContains: schemas[schemaKey]?.description?.includes('[LANGUAGE]'),
            updatedDescription: localizedSchemas[schemaKey]?.description?.substring(0, 200) + '...',
            languageReplaced: localizedSchemas[schemaKey]?.description?.includes(currentLanguage)
        });
    }

    console.log('Schema updated...', input.type)
  
    if (DEBUG) {
        await sleep(1500);
        return Promise.resolve(TEST_DATA[input.type][Math.floor(Math.random() * TEST_DATA[input.type].length)] as Analysis);
    }

    console.log('evaluating...')
    // get basic item info with enhanced context
    let data = await evaluate([{
        type: 'text',
        text: analysisText
    }] , input.type, tokenUsage, currentLanguage) as Analysis;
    console.log('input assesed...');

    // Merge with previous analysis if available
    if (input.previousAnalysis && input.type === Types.diagnosis) {
        data = mergeAnalysis(data, input.previousAnalysis);
        console.log('🔄 Merged with previous analysis');
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




export async function evaluate(content: Content[], type: Types, tokenUsage: TokenUsage, language: string = 'English'): Promise<Analysis> {

  const schema = localizedSchemas[type];
  console.log('Schema', type, 'Language:', language)

  if (!schema) error(500, { message: 'Invalid type ' + type });

  return await fetchGpt(content, schema, tokenUsage, language) as Analysis;
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

// Utility function to generate content-based IDs for items
function generateItemId(item: any, type: string): string {
    const content = type === 'diagnosis' ? item.name : 
                   type === 'treatment' ? item.description :
                   type === 'medication' ? item.name :
                   type === 'followUp' ? item.name :
                   type === 'clarifyingQuestions' ? item.question :
                   type === 'doctorRecommendations' ? item.recommendation :
                   JSON.stringify(item);
    
    // Simple hash function for consistent IDs
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return `${type}_${Math.abs(hash).toString(36)}`;
}

// Utility function to create previous context summary for AI
function createPreviousContextSummary(previousAnalysis: Partial<Analysis>): string {
    const summaryParts: string[] = [];
    
    if (previousAnalysis.diagnosis?.length) {
        const diagnosisList = previousAnalysis.diagnosis
            .map(d => `${d.name} (confidence: ${d.probability || 0})`)
            .join(', ');
        summaryParts.push(`Previous diagnoses: ${diagnosisList}`);
    }
    
    if (previousAnalysis.treatment?.length) {
        const treatmentList = previousAnalysis.treatment
            .map(t => t.description)
            .join('; ');
        summaryParts.push(`Previous treatments: ${treatmentList}`);
    }
    
    if (previousAnalysis.medication?.length) {
        const medicationList = previousAnalysis.medication
            .map(m => `${m.name} ${m.dosage}mg`)
            .join(', ');
        summaryParts.push(`Previous medications: ${medicationList}`);
    }
    
    if (previousAnalysis.clarifyingQuestions?.length) {
        const questionCount = previousAnalysis.clarifyingQuestions.length;
        summaryParts.push(`${questionCount} questions already suggested`);
    }
    
    if (previousAnalysis.doctorRecommendations?.length) {
        const recommendationCount = previousAnalysis.doctorRecommendations.length;
        summaryParts.push(`${recommendationCount} recommendations already provided`);
    }
    
    return summaryParts.length > 0 
        ? `\n\nPREVIOUS ANALYSIS CONTEXT:\n${summaryParts.join('\n')}\n\nINSTRUCTIONS: Build upon the previous analysis rather than starting fresh. Refine confidence scores and add details based on new evidence. Only suggest new items if they are genuinely different from what was previously identified. Maintain continuity for better user experience.\n\n`
        : '';
}

// Utility function to merge two analysis objects
function mergeAnalysis(newAnalysis: Analysis, previousAnalysis: Partial<Analysis>): Analysis {
    const mergedAnalysis = { ...newAnalysis };
    
    // Ensure arrays exist before merging
    mergedAnalysis.diagnosis = [...(newAnalysis.diagnosis || []), ...(previousAnalysis.diagnosis || [])];
    mergedAnalysis.treatment = [...(newAnalysis.treatment || []), ...(previousAnalysis.treatment || [])];
    mergedAnalysis.medication = [...(newAnalysis.medication || []), ...(previousAnalysis.medication || [])];
    mergedAnalysis.followUp = [...(newAnalysis.followUp || []), ...(previousAnalysis.followUp || [])];
    mergedAnalysis.clarifyingQuestions = [...(newAnalysis.clarifyingQuestions || []), ...(previousAnalysis.clarifyingQuestions || [])];
    mergedAnalysis.doctorRecommendations = [...(newAnalysis.doctorRecommendations || []), ...(previousAnalysis.doctorRecommendations || [])];
    mergedAnalysis.signals = [...(newAnalysis.signals || []), ...(previousAnalysis.signals || [])];
    
    return mergedAnalysis;
}