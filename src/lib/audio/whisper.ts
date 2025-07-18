import OpenAI from "openai";
import { OPENAI_API_KEY } from "$env/static/private";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function transcribeAudio(
  audioData: File,
  instructions: { lang: string } = { lang: "en" },
) {
  const transcription = await openai.audio.transcriptions.create({
    file: audioData,
    model: "whisper-1",
    language: instructions.lang,
    response_format: "text",
    prompt:
      "The transcript is a part of a doctor patient session convesation. The doctor is asking the patient about their symptoms and the patient is responding. A nurse or multiple doctors may be part of the conversation.", //,
    //timestamp_granularities: ["word"]
  });

  //console.log(transcription);
  return {
    text: transcription,
  };
}
