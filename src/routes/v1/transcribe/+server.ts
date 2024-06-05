import OpenAIApi from 'openai';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';



const openai = new OpenAIApi({
  apiKey: process.env.OPENAI_API_KEY,
});


export async function POST({ request }) {
  const formData = Object.fromEntries(await request.formData());
  const { audio } = formData as { audio: File };

  if (!audio) {
    return new Response(JSON.stringify({ error: 'No audio file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }


  // Convert the file to a readable stream
  const buffer = Buffer.from(await audio.arrayBuffer());
  const readableStream = new ReadableStream({
    start(controller) {
      controller.enqueue(buffer);
      controller.close();
    }
  });

  try {
    const response = await openai.createTranscription(
      readableStream,
      "whisper-1"
    );

    return new Response(JSON.stringify(response.data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}