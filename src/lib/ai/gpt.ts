import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage } from "@langchain/core/messages";
import { env } from '$env/dynamic/private';
import { type Content, type TokenUsage } from '$slib/ai/types.d';


export async function fetchGpt(content: Content[], schema: any, tokenUsage: TokenUsage): Promise<object> {

    // Instantiate the parser
    const parser = new JsonOutputFunctionsParser();


    // Instantiate the ChatOpenAI class
    const model = new ChatOpenAI({ 
        model: env.LLM_MODEL_ID,
        apiKey: env.OPENAI_API_KEY,
        callbacks: [
          {
            handleLLMEnd(output, runId, parentRunId, tags) {
              //console.log('token Usage', output.llmOutput?.tokenUsage.totalTokens);
              tokenUsage.total += output.llmOutput?.tokenUsage.totalTokens || 0;
              tokenUsage[schema.description] = output.llmOutput?.tokenUsage.totalTokens || 0;
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
    ])

    return result;
}
