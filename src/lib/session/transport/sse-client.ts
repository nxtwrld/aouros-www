import EventEmitter from "eventemitter3";
import type { PartialTranscript } from "./manager";

export interface SSEOptions {
  sessionId: string;
  onTranscript?: (transcript: PartialTranscript) => void;
  onAnalysis?: (analysis: any) => void;
  onError?: (error: any) => void;
  onStatus?: (status: any) => void;
}

export class SSEClient extends EventEmitter {
  private sessionId: string;
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor(private options: SSEOptions) {
    super();
    this.sessionId = options.sessionId;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (this.options.onTranscript) {
      this.on("partial_transcript", this.options.onTranscript);
    }
    if (this.options.onAnalysis) {
      this.on("analysis_update", this.options.onAnalysis);
    }
    if (this.options.onError) {
      this.on("error", this.options.onError);
    }
    if (this.options.onStatus) {
      this.on("session_status", this.options.onStatus);
    }
  }

  async connect(): Promise<boolean> {
    console.log("📡 SSE connect() called", {
      isConnecting: this.isConnecting,
      currentState: this.eventSource?.readyState,
      sessionId: this.sessionId,
    });

    if (
      this.isConnecting ||
      (this.eventSource && this.eventSource.readyState === EventSource.OPEN)
    ) {
      console.log("⚠️ Already connecting or connected, returning true");
      return true;
    }

    this.isConnecting = true;

    try {
      const sseUrl = `/v1/session/${this.sessionId}/stream`;

      console.log("📡 Creating SSE connection to:", sseUrl);
      this.eventSource = new EventSource(sseUrl);

      return new Promise((resolve, reject) => {
        if (!this.eventSource) {
          console.error("❌ Failed to create EventSource instance");
          reject(new Error("Failed to create EventSource"));
          return;
        }

        this.eventSource.onopen = () => {
          console.log(`✅ SSE OPENED for session: ${this.sessionId}`);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve(true);
        };

        this.eventSource.onmessage = (event) => {
          console.log("📨 SSE message received:", event.data);
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("❌ Error parsing SSE message:", error, event.data);
            this.emit("error", { message: "Invalid message format" });
          }
        };

        this.eventSource.onerror = (event) => {
          console.error(`❌ SSE ERROR for session: ${this.sessionId}`, event);
          this.isConnecting = false;

          if (this.eventSource?.readyState === EventSource.CLOSED) {
            console.log("🔌 SSE connection closed, attempting reconnect...");
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.scheduleReconnect();
            } else {
              this.emit("error", {
                message: "Max reconnection attempts reached",
              });
              reject(new Error("SSE connection failed"));
            }
          }
        };

        // Set a connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            console.error("⏰ SSE connection timeout");
            this.isConnecting = false;
            reject(new Error("SSE connection timeout"));
          }
        }, 5000);
      });
    } catch (error) {
      this.isConnecting = false;
      console.error("❌ Failed to create SSE connection:", error);
      return false;
    }
  }

  private handleMessage(message: any) {
    console.log("📡 SSE message handled:", message);

    switch (message.type) {
      case "partial_transcript":
        this.emit("partial_transcript", message.data);
        break;
      case "analysis_update":
        this.emit("analysis_update", message.data);
        break;
      case "session_status":
        this.emit("session_status", message.data);
        break;
      case "ai_thinking":
        console.log("🤖 AI is analyzing...", message.data);
        this.emit("ai_thinking", message.data);
        break;
      case "error":
        this.emit("error", message.data);
        break;
      default:
        console.warn("Unknown SSE message type:", message.type);
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    console.log(
      `🔄 Scheduling SSE reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`,
    );

    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect().catch(console.error);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000); // Exponential backoff, max 10s
      }
    }, this.reconnectDelay);
  }

  async sendAudioChunk(audioData: Float32Array): Promise<boolean> {
    console.log("📡 SSE sendAudioChunk called", {
      connectionState: this.connectionState,
      dataLength: audioData.length,
      sessionId: this.sessionId,
    });

    // For SSE, we send audio via HTTP POST, not through the SSE connection
    try {
      const { convertFloat32ToMp3 } = await import("$lib/audio/microphone");
      const mp3Blob = await convertFloat32ToMp3(audioData, 16000);

      const formData = new FormData();
      formData.append("audio", mp3Blob, "chunk.mp3");
      formData.append("timestamp", Date.now().toString());

      console.log("📡 Sending audio chunk via HTTP to SSE session...");

      const response = await fetch(`/v1/session/${this.sessionId}/audio`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log(
          "✅ Audio chunk sent successfully via HTTP to SSE session:",
          result,
        );
        return true;
      } else {
        console.error("❌ Audio chunk upload failed:", response.status);
        this.emit("error", { message: "Audio upload failed" });
        return false;
      }
    } catch (error) {
      console.error("❌ Audio chunk upload error:", error);
      this.emit("error", { message: "Audio upload error" });
      return false;
    }
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts + 1; // Prevent reconnection

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.removeAllListeners();
    console.log("🛑 SSE disconnected");
  }

  get isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  get connectionState(): string {
    if (!this.eventSource) return "disconnected";

    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING:
        return "connecting";
      case EventSource.OPEN:
        return "connected";
      case EventSource.CLOSED:
        return "closed";
      default:
        return "unknown";
    }
  }
}
