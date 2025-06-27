// npm install assemblyai

import { AssemblyAI, type TranscribeParams } from "assemblyai";
//import { SpeechModel } from 'assemblyai/dist/types';
import { env } from "$env/dynamic/private";
import fs from "fs/promises";
import axios from "axios";

/*import path from "path"
const __dirname = path.resolve();*/

let client: AssemblyAI;

function getClient() {
  if (client) {
    return client;
  }
  return (client = new AssemblyAI({
    apiKey: env.ASSEMBLYAI_API_KEY,
  }));
}

export async function uploadAudio(audioData: Uint8Array) {
  const baseUrl = "https://api.assemblyai.com/v2";

  const headers = {
    authorization: env.ASSEMBLYAI_API_KEY,
  };
  const uploadResponse = await axios.post(`${baseUrl}/upload`, audioData, {
    headers,
  });
  const uploadUrl = uploadResponse.data.upload_url;

  return uploadUrl;
}

export async function transcribeAudio(
  audioData: File,
  instructions: { lang: string },
) {
  const client = getClient();

  //fs.writeFile('testData/audio-test.mp3', audioData); return;
  /*
    return {
        text: 'test',
        confidence: 0.9
    }*/

  const audioUrl = await uploadAudio(
    new Uint8Array(await audioData.arrayBuffer()),
  );

  const config: TranscribeParams = {
    audio_url: audioUrl,
    speech_model: "nano", // as SpeechModel,
    language_code: instructions.lang,
    //language_detection: true
  };

  const transcript = await client.transcripts.transcribe(config);

  if (transcript.status === "error") {
    console.error(transcript);
    return {
      error: transcript.error,
    };
  }
  //console.log(transcript.text);

  // convert words to conversation with array of speakers utterances and text
  const conversation = transcript.words?.reduce(
    (acc, word) => {
      if (acc.length > 0 && acc[acc.length - 1].speaker === word.speaker) {
        acc[acc.length - 1].text += ` ${word.text}`;
      } else {
        acc.push({
          speaker: word.speaker,
          text: word.text,
        });
      }
      return acc;
    },
    [] as { speaker: string | null | undefined; text: string }[],
  );

  return {
    confidence: transcript.confidence,
    conversation,
    text: transcript.text,
  };
}
