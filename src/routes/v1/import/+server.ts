
import { error, json } from '@sveltejs/kit';
import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage } from "@langchain/core/messages";
import type { Extractor } from '$lib/textract';
//import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
//import { type RunnableConfig, RunnableWithMessageHistory } from "@langchain/core/runnables";
//import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { env } from '$env/dynamic/private';
import report from './report.json';

// Instantiate the parser
const parser = new JsonOutputFunctionsParser();

const schemas: {
    [key: string]: Extractor
} = {};

schemas.report = report as Extractor;


// Define the function schema
/*
const extractionFunctionSchema = {
  name: "extractor",
  description: "As a medical professional asses the user input and extracts fields from the input.",
  parameters: {
    type: "object",
    properties: {
      days: {
        type: "string",
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        description: "What days is the medication supposed to be taken",
      },
      time_of_day: {
        type: "string",
        enum: ["morning", "afternoon", "evening", "night"],
        description: "What time of the day is the medication supposed to be taken",
      },
      medication: {
        type: "string",
        description: "The name of the medication",
      },
      dosage: {
        type: "number",
        description: "The number of pilss that is supposed to taken every occation",
      },
      chat_response: {
        type: "string",
        description: "An empathic and encouraging response to the human's input",
      },
    },
    required: ["days", "medication", "dosage", "chat_response"],
  },
};
*/


/**
{
  result: {
    tone: 'positive',
    word_count: 4,
    chat_response: "Indeed, it's a lovely day!"
  }
}
 */



/** @type {import('./$types.d').RequestHandler} */
/*
export async function GET({ url }) {
	//const str = url.searchParams.get('drug');


    // Instantiate the ChatOpenAI class
    const model = new ChatOpenAI({ 
        model: "gpt-4",
        apiKey: env.OPENAI_API_KEY
    });

    // Create a new runnable, bind the function to the model, and pipe the output through the parser
    const runnable = model
    .bind({
        functions: [extractionFunctionSchema],
        function_call: { name: "extractor" },
    })
    .pipe(parser);

    // Invoke the runnable with an input
    const result = await runnable.invoke([
        new HumanMessage("I take Letrox 75 every day in the morning before breakfast."),
    ]);

    console.log({ result });

    return json(result);
}*/

/** @type {import('./$types.d').RequestHandler} */
export async function POST({ request }) {
	//const str = url.searchParams.get('drug');

    const data = await request.json();

    // Instantiate the ChatOpenAI class
    const model = new ChatOpenAI({ 
        model: "gpt-4o",
        apiKey: env.OPENAI_API_KEY,
        callbacks: [
          {
            handleLLMEnd(output, runId, parentRunId, tags) {
              console.log('Token Usage', output.llmOutput.tokenUsage.totalTokens);
            },
          },
        ]
    });
  

    // Create a new runnable, bind the function to the model, and pipe the output through the parser
    if (typeof data.schema == 'string' ) {
      if (schemas[data.schema] === undefined) {
        throw error(404, { message: 'Schema does not exist: ' + data.schema })
      } else {
        data.schema = schemas[data.schema];
      }
    }

    const content = [];
    if (data.text) {
      content.push({
        type: 'text',
        text: `${data.text}`,
      });
    }
    if (data.image) {
      content.push({
        type: 'image_url',
        image_url: {
          url: data.image
        }
      });
    }

    if (content.length === 0) {
        throw error(400, { message: 'No content provided' });
    }
  
    const runnable = model
        .bind({
            functions: [ data.schema ],
            function_call: { name: "extractor" },
        })
        .pipe(parser);

    // Invoke the runnable with an input
    const result = await runnable.invoke([
        new HumanMessage({
          content
        })
    ]);


    return json(result);
}

