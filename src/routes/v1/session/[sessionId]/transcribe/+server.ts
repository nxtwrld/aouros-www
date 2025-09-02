import { error, json, type RequestHandler } from "@sveltejs/kit";
import { transcriptionProvider } from "$lib/ai/providers/transcription-abstraction";
import { getSession } from "$lib/session/manager";

export const POST: RequestHandler = async ({
  params,
  request,
  locals: { supabase, safeGetSession, user },
}) => {
  const { session } = await safeGetSession();

  if (!session || !user) {
    error(401, { message: "Unauthorized" });
  }

  const sessionId = params.sessionId!;
  console.log("🎯 TRANSCRIBE: Audio chunk received for session:", sessionId);

  // Retrieve session data to get language and other settings
  const sessionData = getSession(sessionId);
  if (!sessionData) {
    console.error("❌ TRANSCRIBE: Session not found:", sessionId);
    error(404, { message: "Session not found" });
  }

  try {
    // Use session language for transcription with fallback to English
    let instructions = {
      lang: sessionData.language || "en",
      translate: sessionData.translate || false,
    };

    const formData = await request.formData();
    const uploadedFile = formData.get("audio") as File;
    const chunkId = formData.get("chunkId") as string;
    const sequenceNumber = formData.get("sequenceNumber") as string;
    const timestamp = formData.get("timestamp") as string;
    const instructionsExtend = formData.get("instructions") as string;

    // Parse custom instructions if provided
    if (instructionsExtend) {
      try {
        instructions = Object.assign(
          instructions,
          JSON.parse(instructionsExtend),
        );
      } catch (e) {
        console.warn("Failed to parse transcription instructions:", e);
      }
    }

    // Validate required fields
    if (!uploadedFile) {
      error(400, { message: "No audio file provided" });
    }
    if (!(uploadedFile instanceof File)) {
      error(400, { message: "Invalid file format" });
    }
    if (!uploadedFile.type.includes("audio")) {
      error(400, { message: "Invalid file type - must be audio" });
    }
    if (!chunkId) {
      error(400, { message: "Missing chunkId" });
    }

    console.log("🔄 TRANSCRIBE: Processing", {
      sessionId: sessionId.substring(0, 8) + "...",
      chunkId: chunkId.substring(0, 8) + "...",
      language: instructions.lang,
      translate: instructions.translate,
      size: `${Math.round(uploadedFile.size / 1024)}KB`,
    });

    // Initialize transcription provider and transcribe
    await transcriptionProvider.initialize();
    const transcriptionResult = await transcriptionProvider.transcribeAudioCompatible(
      uploadedFile,
      instructions,
    );

    // Enhanced response format for session-based transcription
    const response = {
      success: true,
      sessionId,
      chunkId,
      sequenceNumber: sequenceNumber ? parseInt(sequenceNumber, 10) : undefined,
      timestamp: timestamp ? parseInt(timestamp, 10) : Date.now(),
      transcription: {
        text: transcriptionResult.text || "",
        confidence: transcriptionResult.confidence || 0.8,
        language: instructions.lang,
        duration: transcriptionResult.duration,
      },
      processing: {
        provider: "whisper", // transcriptionProvider info
        processingTime: Date.now() - (timestamp ? parseInt(timestamp, 10) : Date.now()),
      },
    };

    console.log("✅ TRANSCRIBE: Completed", {
      sessionId: sessionId.substring(0, 8) + "...",
      chunkId: chunkId.substring(0, 8) + "...",
      chars: response.transcription.text.length,
      preview: response.transcription.text.substring(0, 30) + (response.transcription.text.length > 30 ? "..." : ""),
    });

    return json(response);
  } catch (err) {
    console.error("❌ TRANSCRIBE: Failed to process audio chunk:", {
      sessionId,
      error: err instanceof Error ? err.message : String(err),
    });
    error(500, { message: "Failed to transcribe audio chunk" });
  }
};