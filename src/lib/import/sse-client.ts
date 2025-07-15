import type { Assessment } from "$lib/import.server/assessInputs";
import type { ReportAnalysis } from "$lib/import.server/analyzeReport";
import { resizeImage } from "$lib/images";
import { PROCESS_SIZE } from "$lib/files/CONFIG";

// SSE Progress Event interface
export interface SSEProgressEvent {
  type: "progress" | "complete" | "error";
  stage: string;
  progress: number;
  message: string;
  data?: any;
  fileId?: string;
  timestamp: number;
}

// Progress callback type
export type ProgressCallback = (event: SSEProgressEvent) => void;

// Error callback type
export type ErrorCallback = (error: Error, fileId?: string) => void;

// SSE Client for import operations
export class SSEImportClient {
  private onProgressCallback?: ProgressCallback;
  private onErrorCallback?: ErrorCallback;
  private activeConnections: Map<string, EventSource> = new Map();

  // Set progress callback
  onProgress(callback: ProgressCallback): void {
    this.onProgressCallback = callback;
  }

  // Set error callback
  onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback;
  }

  // Extract documents using SSE endpoint
  async extractDocuments(files: File[]): Promise<Assessment[]> {
    const results: Assessment[] = [];

    for (const file of files) {
      try {
        const fileId = `${file.name}-${file.size}-${Date.now()}`;
        const result = await this.extractSingleFile(file, fileId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to extract file ${file.name}:`, error);
        this.onErrorCallback?.(
          error instanceof Error
            ? error
            : new Error("Unknown extraction error"),
          file.name,
        );
      }
    }

    return results;
  }

  // Extract single file with SSE progress
  private async extractSingleFile(
    file: File,
    fileId: string,
  ): Promise<Assessment> {
    // Convert file to base64 for processing
    const images = await this.prepareImages([file]);

    // Make SSE request to the stream endpoint
    return this.makeSSERequest(
      "/v1/import/extract/stream",
      {
        images,
      },
      fileId,
    );
  }

  // Analyze documents using SSE endpoint
  async analyzeDocuments(
    assessments: Assessment[],
    language?: string,
  ): Promise<ReportAnalysis[]> {
    const results: ReportAnalysis[] = [];

    for (const assessment of assessments) {
      try {
        // Convert assessment to analysis input format - analyze each document individually
        for (const document of assessment.documents) {
          const documentText = assessment.pages
            .filter((page) => document.pages.includes(page.page))
            .map((page) => page.text)
            .join("\n");

          const analysisInput = {
            text: documentText,
            language: language || "English",
          };

          console.log(`🔬 Analyzing document "${document.title}" individually:`, {
            documentTitle: document.title,
            textLength: documentText.length,
            pages: document.pages,
            hasText: !!documentText
          });

          const fileId = `doc-${document.title}-${Date.now()}`;
          const result = await this.analyzeSingleDocument(
            analysisInput,
            fileId,
          );
          
          console.log(`✅ Analysis completed for "${document.title}":`, {
            documentTitle: document.title,
            resultType: result.type,
            isMedical: result.isMedical,
            hasReport: !!result.report,
            reportKeys: result.report ? Object.keys(result.report) : []
          });
          
          results.push(result);
        }
      } catch (error) {
        console.error("Failed to analyze document:", error);
        this.onErrorCallback?.(
          error instanceof Error ? error : new Error("Unknown analysis error"),
        );
      }
    }

    console.log(`📊 Document-by-document analysis completed:`, {
      totalDocuments: results.length,
      results: results.map(r => ({ 
        type: r.type, 
        isMedical: r.isMedical, 
        title: r.report?.title 
      }))
    });

    return results;
  }

  // Analyze single document with SSE progress
  private async analyzeSingleDocument(
    input: { text: string; language?: string; images?: string[] },
    fileId: string,
  ): Promise<ReportAnalysis> {
    return this.makeSSERequest("/v1/import/report/stream", input, fileId);
  }

  // Make SSE request with progress tracking
  private async makeSSERequest<T>(
    endpoint: string,
    data: any,
    fileId: string,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Make POST request to SSE endpoint
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(data),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          if (!response.body) {
            throw new Error("No response body for SSE stream");
          }

          // Read SSE stream
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          const readStream = async (): Promise<void> => {
            try {
              const { done, value } = await reader.read();

              if (done) {
                return;
              }

              // Decode and buffer the stream data
              buffer += decoder.decode(value, { stream: true });

              // Process complete messages
              const lines = buffer.split("\n");
              buffer = lines.pop() || ""; // Keep incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const jsonData = line.slice(6);
                    console.log("🔍 SSE raw data:", jsonData);
                    
                    if (!jsonData || jsonData.trim() === '') {
                      console.warn("Empty SSE data received, skipping");
                      continue;
                    }
                    
                    const eventData = JSON.parse(jsonData);
                    console.log("📨 SSE parsed event:", eventData);
                    
                    this.handleSSEEvent(eventData, fileId, resolve, reject);
                  } catch (parseError) {
                    console.error("Failed to parse SSE event:", {
                      parseError,
                      rawLine: line,
                      jsonData: line.slice(6)
                    });
                  }
                }
              }

              // Continue reading
              await readStream();
            } catch (streamError) {
              console.error("SSE stream error:", streamError);
              reject(streamError);
            }
          };

          readStream();
        })
        .catch((error) => {
          console.error("SSE request failed:", error);
          this.onErrorCallback?.(error, fileId);
          reject(error);
        });
    });
  }

  // Handle individual SSE events
  private handleSSEEvent<T>(
    eventData: SSEProgressEvent,
    fileId: string,
    resolve: (value: T) => void,
    reject: (reason: any) => void,
  ): void {
    // Safety check for undefined eventData
    if (!eventData || typeof eventData !== 'object') {
      console.error("SSE received invalid eventData:", eventData);
      const error = new Error("Invalid SSE event data received");
      this.onErrorCallback?.(error, fileId);
      reject(error);
      return;
    }

    // Add fileId to event
    const enhancedEvent = { ...eventData, fileId };

    // Emit progress event
    this.onProgressCallback?.(enhancedEvent);

    // Handle completion
    if (eventData.type === "complete") {
      resolve(eventData.data);
    }

    // Handle errors
    if (eventData.type === "error") {
      const error = new Error(eventData.message);
      this.onErrorCallback?.(error, fileId);
      reject(error);
    }
  }

  // Prepare images for processing (resize, convert to base64)
  private async prepareImages(files: File[]): Promise<string[]> {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    return Promise.all(
      imageFiles.map(async (file) => {
        // Convert to base64
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            // Resize image
            resizeImage(base64, PROCESS_SIZE).then(resolve).catch(reject);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }),
    );
  }

  // Clean up active connections
  cleanup(): void {
    for (const [fileId, eventSource] of this.activeConnections) {
      eventSource.close();
    }
    this.activeConnections.clear();
  }

  // Complete document processing workflow with SSE
  async processDocumentsSSE(
    files: File[],
    options: {
      language?: string;
      onStageChange?: (stage: "extract" | "analyze") => void;
    } = {},
  ): Promise<{ assessments: Assessment[]; analyses: ReportAnalysis[] }> {
    try {
      // Stage 1: Extract documents
      options.onStageChange?.("extract");
      const assessments = await this.extractDocuments(files);

      // Stage 2: Analyze documents
      options.onStageChange?.("analyze");
      const analyses = await this.analyzeDocuments(
        assessments,
        options.language,
      );

      return { assessments, analyses };
    } catch (error) {
      console.error("SSE document processing failed:", error);
      throw error;
    }
  }
}

// Fallback function for non-SSE processing
export async function processDocumentsFallback(
  files: File[],
  options: { language?: string } = {},
): Promise<{ assessments: Assessment[]; analyses: ReportAnalysis[] }> {
  // Use existing non-SSE methods as fallback
  const { processImages } = await import("$lib/files/image");
  const { analyze } = await import("$lib/import.server/analyzeReport");

  const assessments: Assessment[] = [];
  const analyses: ReportAnalysis[] = [];

  // Process each file using existing methods
  for (const file of files) {
    if (file.type.startsWith("image/")) {
      // Use existing image processing
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resized = await resizeImage(base64, PROCESS_SIZE);
      const assessment = await processImages([resized]);
      assessments.push(assessment);

      // Analyze each document
      for (const document of assessment.documents) {
        const documentText = assessment.pages
          .filter((page: any) => document.pages.includes(page.page))
          .map((page: any) => page.text)
          .join("\n");

        const analysisResult = await analyze({
          text: documentText,
          language: options.language || "English",
        });
        analyses.push(analysisResult);
      }
    }
  }

  return { assessments, analyses };
}

// Create singleton instance
export const sseImportClient = new SSEImportClient();
