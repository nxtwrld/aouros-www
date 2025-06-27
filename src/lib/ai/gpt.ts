import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputFunctionsParser } from "langchain/output_parsers";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { env } from "$env/dynamic/private";
import { type Content, type TokenUsage } from "$lib/ai/types.d";

export async function fetchGpt(
  content: Content[],
  schema: any,
  tokenUsage: TokenUsage,
  language: string = "English",
): Promise<object> {
  // Instantiate the parser
  const parser = new JsonOutputFunctionsParser();

  console.log("🤖 GPT Request Language:", language);

  // Instantiate the ChatOpenAI class
  const model = new ChatOpenAI({
    model: env.LLM_MODEL_ID,
    apiKey: env.OPENAI_API_KEY,
    callbacks: [
      {
        handleLLMEnd(output, runId, parentRunId, tags) {
          //console.log('token Usage', output.llmOutput?.tokenUsage.totalTokens);
          tokenUsage.total += output.llmOutput?.tokenUsage.totalTokens || 0;
          tokenUsage[schema.description] =
            output.llmOutput?.tokenUsage.totalTokens || 0;
          //console.log(JSON.stringify(output.llmOutput?.tokenUsage))
        },
      },
    ],
  });

  const runnable = model
    .bind({
      functions: [schema],
      function_call: { name: "extractor" },
    })
    .pipe(parser);

  // Create system message to enforce language
  const systemMessage = new SystemMessage({
    content: `You are a medical AI assistant. You MUST respond in ${language} language ONLY. All text in your response must be in ${language}. Do not use any other language. If the language is "English", respond only in English. If the language is "Czech", respond only in Czech. This is critical - strictly follow the language requirement.`,
  });

  // Create human message with the content
  const humanMessage = new HumanMessage({
    content,
  });

  // Invoke the runnable with system message + human message
  const result = await runnable.invoke([systemMessage, humanMessage]);

  console.log("🤖 GPT Response received, language should be:", language);

  return result;
}
