import { writable, derived, get } from "svelte/store";
import type { Writable, Readable } from "svelte/store";
import { logger } from "$lib/logging/logger";
import type { TranscriptItem } from "./unified-session-store";

// Transcript processing and analysis types
export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  confidence: number;
  tokens: TranscriptToken[];
  metadata: TranscriptMetadata;
}

export interface TranscriptToken {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface TranscriptMetadata {
  language: string;
  modelVersion: string;
  processingTime: number;
  audioQuality?: number;
  backgroundNoise?: number;
}

export interface SpeakerInfo {
  id: string;
  name: string;
  role?: "doctor" | "patient" | "nurse" | "other";
  segments: string[]; // segment IDs
  totalSpeakingTime: number;
  averageConfidence: number;
}

export interface TranscriptAnalytics {
  totalDuration: number;
  wordCount: number;
  speakerCount: number;
  averageConfidence: number;
  languageDetection: {
    language: string;
    confidence: number;
    alternatives: { language: string; confidence: number }[];
  };
  sentimentAnalysis?: {
    overall: "positive" | "neutral" | "negative";
    confidence: number;
    segments: { segmentId: string; sentiment: string; confidence: number }[];
  };
  keyTerms: {
    term: string;
    frequency: number;
    importance: number;
    category: "medical" | "symptom" | "treatment" | "general";
  }[];
}

// Main transcript store state
export interface TranscriptState {
  // Raw transcript data
  items: TranscriptItem[];
  segments: TranscriptSegment[];
  speakers: Map<string, SpeakerInfo>;

  // Processing state
  isProcessing: boolean;
  processingQueue: TranscriptItem[];
  currentSegment: TranscriptSegment | null;

  // Real-time streaming
  isStreaming: boolean;
  streamBuffer: string;
  lastSegmentTime: number;

  // Analytics and insights
  analytics: TranscriptAnalytics | null;

  // Search and filtering
  searchQuery: string;
  filteredSegments: TranscriptSegment[];
  selectedSpeaker: string | null;

  // Export and persistence
  sessionId: string | null;
  lastSaved: number | null;

  // Error handling
  error: string | null;
  warnings: string[];
}

const initialState: TranscriptState = {
  items: [],
  segments: [],
  speakers: new Map(),
  isProcessing: false,
  processingQueue: [],
  currentSegment: null,
  isStreaming: false,
  streamBuffer: "",
  lastSegmentTime: 0,
  analytics: null,
  searchQuery: "",
  filteredSegments: [],
  selectedSpeaker: null,
  sessionId: null,
  lastSaved: null,
  error: null,
  warnings: [],
};

// Main transcript store
export const transcriptStore: Writable<TranscriptState> =
  writable(initialState);

// Derived stores for easy access
export const transcriptItems: Readable<TranscriptItem[]> = derived(
  transcriptStore,
  ($store) => $store.items,
);

export const transcriptSegments: Readable<TranscriptSegment[]> = derived(
  transcriptStore,
  ($store) => ($store.searchQuery ? $store.filteredSegments : $store.segments),
);

export const speakers: Readable<SpeakerInfo[]> = derived(
  transcriptStore,
  ($store) => Array.from($store.speakers.values()),
);

export const isProcessingTranscripts: Readable<boolean> = derived(
  transcriptStore,
  ($store) => $store.isProcessing || $store.isStreaming,
);

export const transcriptAnalytics: Readable<TranscriptAnalytics | null> =
  derived(transcriptStore, ($store) => $store.analytics);

export const currentTranscriptText: Readable<string> = derived(
  transcriptStore,
  ($store) => $store.segments.map((s) => s.text).join(" "),
);

// Actions for transcript management
export const transcriptActions = {
  // Add new transcript item (from real-time stream)
  addTranscriptItem(item: TranscriptItem): void {
    transcriptStore.update((state) => ({
      ...state,
      items: [...state.items, item],
      processingQueue: [...state.processingQueue, item],
      streamBuffer: item.is_final
        ? state.streamBuffer + " " + item.text
        : item.text,
      lastSegmentTime: item.timestamp,
    }));

    logger.transcript.debug("Transcript item added", {
      id: item.id,
      text: item.text.substring(0, 50) + "...",
      is_final: item.is_final,
      queueLength: get(transcriptStore).processingQueue.length,
    });

    // Process the item if it's final
    if (item.is_final) {
      transcriptActions.processQueuedItems();
    }
  },

  // Process queued transcript items into segments
  processQueuedItems(): void {
    const currentState = get(transcriptStore);

    if (
      currentState.isProcessing ||
      currentState.processingQueue.length === 0
    ) {
      return;
    }

    transcriptStore.update((state) => ({
      ...state,
      isProcessing: true,
    }));

    logger.transcript.info("Processing transcript queue", {
      itemCount: currentState.processingQueue.length,
    });

    // Group items into segments based on speaker and timing
    const segments = transcriptActions.groupItemsIntoSegments(
      currentState.processingQueue,
    );

    transcriptStore.update((state) => ({
      ...state,
      segments: [...state.segments, ...segments],
      processingQueue: [],
      isProcessing: false,
      streamBuffer: "",
    }));

    // Update speakers
    transcriptActions.updateSpeakerInfo(segments);

    // Recalculate analytics
    transcriptActions.calculateAnalytics();

    logger.transcript.info("Transcript processing completed", {
      newSegments: segments.length,
      totalSegments: get(transcriptStore).segments.length,
    });
  },

  // Group transcript items into coherent segments
  groupItemsIntoSegments(items: TranscriptItem[]): TranscriptSegment[] {
    if (items.length === 0) return [];

    const segments: TranscriptSegment[] = [];
    let currentSegmentItems: TranscriptItem[] = [];
    let currentSpeaker = items[0].speaker;

    const SEGMENT_GAP_MS = 5000; // 5 seconds gap creates new segment
    const MAX_SEGMENT_LENGTH = 30000; // 30 seconds max per segment

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const prevItem = items[i - 1];

      const shouldCreateNewSegment =
        // Different speaker
        item.speaker !== currentSpeaker ||
        // Time gap too large
        (prevItem && item.timestamp - prevItem.timestamp > SEGMENT_GAP_MS) ||
        // Segment too long
        (currentSegmentItems.length > 0 &&
          item.timestamp - currentSegmentItems[0].timestamp >
            MAX_SEGMENT_LENGTH);

      if (shouldCreateNewSegment && currentSegmentItems.length > 0) {
        // Create segment from current items
        const segment = transcriptActions.createSegmentFromItems(
          currentSegmentItems,
          currentSpeaker,
        );
        segments.push(segment);

        // Start new segment
        currentSegmentItems = [item];
        currentSpeaker = item.speaker;
      } else {
        currentSegmentItems.push(item);
      }
    }

    // Create final segment
    if (currentSegmentItems.length > 0) {
      const segment = transcriptActions.createSegmentFromItems(
        currentSegmentItems,
        currentSpeaker,
      );
      segments.push(segment);
    }

    return segments;
  },

  // Create a segment from grouped items
  createSegmentFromItems(
    items: TranscriptItem[],
    speaker?: string,
  ): TranscriptSegment {
    const sortedItems = items.sort((a, b) => a.timestamp - b.timestamp);
    const combinedText = sortedItems
      .map((item) => item.text)
      .join(" ")
      .trim();
    const startTime = sortedItems[0].timestamp;
    const endTime = sortedItems[sortedItems.length - 1].timestamp;
    const averageConfidence =
      sortedItems.reduce((sum, item) => sum + item.confidence, 0) /
      sortedItems.length;

    // Create tokens from items (simplified)
    const tokens: TranscriptToken[] = sortedItems.flatMap((item) =>
      item.text.split(" ").map((word, index) => ({
        word,
        startTime: item.timestamp + index * 100, // Rough estimation
        endTime: item.timestamp + (index + 1) * 100,
        confidence: item.confidence,
      })),
    );

    const segment: TranscriptSegment = {
      id: `segment_${startTime}_${Math.random().toString(36).substr(2, 9)}`,
      text: combinedText,
      startTime,
      endTime,
      speaker: speaker || "Unknown",
      confidence: averageConfidence,
      tokens,
      metadata: {
        language: "en", // TODO: Detect language
        modelVersion: "1.0",
        processingTime: Date.now() - startTime,
      },
    };

    return segment;
  },

  // Update speaker information
  updateSpeakerInfo(segments: TranscriptSegment[]): void {
    transcriptStore.update((state) => {
      const updatedSpeakers = new Map(state.speakers);

      for (const segment of segments) {
        const speakerId = segment.speaker || "Unknown";

        if (!updatedSpeakers.has(speakerId)) {
          updatedSpeakers.set(speakerId, {
            id: speakerId,
            name: speakerId,
            segments: [],
            totalSpeakingTime: 0,
            averageConfidence: 0,
          });
        }

        const speaker = updatedSpeakers.get(speakerId)!;
        speaker.segments.push(segment.id);
        speaker.totalSpeakingTime += segment.endTime - segment.startTime;

        // Recalculate average confidence
        const allSegments = state.segments.filter(
          (s) => s.speaker === speakerId,
        );
        speaker.averageConfidence =
          allSegments.length > 0
            ? allSegments.reduce((sum, s) => sum + s.confidence, 0) /
              allSegments.length
            : segment.confidence;

        updatedSpeakers.set(speakerId, speaker);
      }

      return { ...state, speakers: updatedSpeakers };
    });
  },

  // Calculate comprehensive analytics
  calculateAnalytics(): void {
    const currentState = get(transcriptStore);
    const segments = currentState.segments;

    if (segments.length === 0) {
      transcriptStore.update((state) => ({
        ...state,
        analytics: null,
      }));
      return;
    }

    const totalDuration =
      Math.max(...segments.map((s) => s.endTime)) -
      Math.min(...segments.map((s) => s.startTime));
    const allText = segments.map((s) => s.text).join(" ");
    const wordCount = allText
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    const speakerCount = currentState.speakers.size;
    const averageConfidence =
      segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length;

    // Extract key terms (simplified)
    const keyTerms = transcriptActions.extractKeyTerms(allText);

    const analytics: TranscriptAnalytics = {
      totalDuration,
      wordCount,
      speakerCount,
      averageConfidence,
      languageDetection: {
        language: "en", // TODO: Implement language detection
        confidence: 0.9,
        alternatives: [],
      },
      keyTerms,
    };

    transcriptStore.update((state) => ({
      ...state,
      analytics,
    }));

    logger.transcript.info("Analytics calculated", {
      totalDuration,
      wordCount,
      speakerCount,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
    });
  },

  // Extract key medical terms and concepts
  extractKeyTerms(text: string): TranscriptAnalytics["keyTerms"] {
    // Simple keyword extraction - in production, use NLP libraries
    const medicalTerms = [
      "headache",
      "migraine",
      "pain",
      "fever",
      "nausea",
      "dizziness",
      "blood pressure",
      "heart rate",
      "medication",
      "prescription",
      "treatment",
      "symptoms",
      "diagnosis",
      "examination",
      "test",
      "scan",
      "x-ray",
      "doctor",
      "nurse",
      "patient",
      "hospital",
      "clinic",
      "appointment",
    ];

    const words = text.toLowerCase().split(/\s+/);
    const termCounts = new Map<string, number>();

    // Count occurrences
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, "");
      if (medicalTerms.includes(cleanWord)) {
        termCounts.set(cleanWord, (termCounts.get(cleanWord) || 0) + 1);
      }
    }

    // Convert to key terms with importance scoring
    const keyTerms: TranscriptAnalytics["keyTerms"] = Array.from(
      termCounts.entries(),
    )
      .map(([term, frequency]) => ({
        term,
        frequency,
        importance: frequency / words.length, // Simple importance score
        category: transcriptActions.categorizeKeyTerm(term),
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 20); // Top 20 terms

    return keyTerms;
  },

  // Categorize key terms
  categorizeKeyTerm(
    term: string,
  ): "medical" | "symptom" | "treatment" | "general" {
    const symptomTerms = [
      "headache",
      "migraine",
      "pain",
      "fever",
      "nausea",
      "dizziness",
    ];
    const treatmentTerms = [
      "medication",
      "prescription",
      "treatment",
      "scan",
      "x-ray",
      "test",
    ];
    const medicalTerms = [
      "blood pressure",
      "heart rate",
      "diagnosis",
      "examination",
    ];

    if (symptomTerms.includes(term)) return "symptom";
    if (treatmentTerms.includes(term)) return "treatment";
    if (medicalTerms.includes(term)) return "medical";
    return "general";
  },

  // Search and filtering
  searchTranscripts(query: string): void {
    transcriptStore.update((state) => {
      const searchQuery = query.toLowerCase().trim();

      if (!searchQuery) {
        return {
          ...state,
          searchQuery: "",
          filteredSegments: [],
        };
      }

      const filteredSegments = state.segments.filter(
        (segment) =>
          segment.text.toLowerCase().includes(searchQuery) ||
          segment.speaker?.toLowerCase().includes(searchQuery),
      );

      return {
        ...state,
        searchQuery,
        filteredSegments,
      };
    });

    logger.transcript.info("Transcript search performed", {
      query,
      resultCount: get(transcriptStore).filteredSegments.length,
    });
  },

  filterBySpeaker(speakerId: string | null): void {
    transcriptStore.update((state) => ({
      ...state,
      selectedSpeaker: speakerId,
      filteredSegments: speakerId
        ? state.segments.filter((s) => s.speaker === speakerId)
        : [],
    }));
  },

  clearFilters(): void {
    transcriptStore.update((state) => ({
      ...state,
      searchQuery: "",
      selectedSpeaker: null,
      filteredSegments: [],
    }));
  },

  // Export and persistence
  exportTranscripts(format: "txt" | "json" | "srt"): string {
    const currentState = get(transcriptStore);
    const segments = currentState.segments;

    switch (format) {
      case "txt":
        return segments
          .map((s) => `[${s.speaker || "Unknown"}]: ${s.text}`)
          .join("\n\n");

      case "json":
        return JSON.stringify(
          {
            sessionId: currentState.sessionId,
            segments: segments,
            speakers: Array.from(currentState.speakers.values()),
            analytics: currentState.analytics,
            exportTime: new Date().toISOString(),
          },
          null,
          2,
        );

      case "srt":
        return segments
          .map((segment, index) => {
            const startTime = transcriptActions.formatSRTTime(
              segment.startTime,
            );
            const endTime = transcriptActions.formatSRTTime(segment.endTime);
            return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
          })
          .join("\n");

      default:
        return "";
    }
  },

  formatSRTTime(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    const milliseconds = date.getUTCMilliseconds().toString().padStart(3, "0");
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  },

  // Utility actions
  clearTranscripts(): void {
    transcriptStore.set({
      ...initialState,
      sessionId: get(transcriptStore).sessionId,
    });
    logger.transcript.info("Transcripts cleared");
  },

  setSessionId(sessionId: string): void {
    transcriptStore.update((state) => ({
      ...state,
      sessionId,
    }));
  },

  setError(error: string | null): void {
    transcriptStore.update((state) => ({
      ...state,
      error,
    }));
  },

  addWarning(warning: string): void {
    transcriptStore.update((state) => ({
      ...state,
      warnings: [...state.warnings, warning],
    }));
  },

  clearWarnings(): void {
    transcriptStore.update((state) => ({
      ...state,
      warnings: [],
    }));
  },

  // Get current state snapshot
  getState(): TranscriptState {
    return get(transcriptStore);
  },
};

// Export main store and actions
export { transcriptStore as default, transcriptActions };
