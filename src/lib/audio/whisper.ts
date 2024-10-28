import OpenAI from "openai";
import { env } from '$env/dynamic/private';

const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY
});

export async function transcribeAudio(audioData: File, instructions: { lang: string } = { lang: 'en' }) {

  const transcription = await openai.audio.transcriptions.create({
    file: audioData,
    model: "whisper-1",
    language: instructions.lang,
    response_format: "text",
    prompt: "The transcript is park of a doctor patient session convesation. The doctor is asking the patient about their symptoms and the patient is responding."//,
    //timestamp_granularities: ["word"]
  });



  //console.log(transcription);
  return {
    text: transcription
  }
}
