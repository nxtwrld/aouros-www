import { GoogleGenerativeAI } from "@google/generative-ai";
import { GOOGLE_API_KEY } from "$env/static/private";

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export type BASE64 = string;

export async function extractText(data: BASE64): Promise<string> {
  const prompt = "Extract text from image in a markdown format";
  const mimeType = data.split(";")[0].split(":")[1];

  const image = {
    inlineData: {
      data,
      mimeType,
    },
  };

  const result = await model.generateContent([prompt, image]);
  console.log(result.response.text());
  return result.response.text();
}
