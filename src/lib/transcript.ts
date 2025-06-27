import EventEmmiter from "eventemitter3";
import { env } from "$env/dynamic/public";

export function connectTranscript() {
  const emitter = new EventEmmiter();
  const socket = new WebSocket(env.PUBLIC_TRANSCRIPTION_URL);

  socket.onopen = () => {
    console.log("WebSocket connection established");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onmessage = (event) => {
    console.log("WebSocket message received:", event.data);
    emitter.emit("transcript", event.data);
  };

  return {
    on: (event: string, callback: (data: string) => void) => {
      emitter.on(event, callback);
    },
    send: (data: string) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(data);
    },
    close: () => {
      socket.close();
      emitter.emit("close");
      emitter.removeAllListeners();
    },
  };
}
