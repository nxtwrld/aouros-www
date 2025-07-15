import { writable, type Writable } from "svelte/store";
import type { SSEProgressEvent } from "./sse-client";

// File progress state interface
export interface FileProgressState {
  fileId: string;
  fileName: string;
  fileSize: number;
  stage: "extract" | "analyze" | "complete" | "error";
  progress: number;
  message: string;
  thumbnail?: string;
  error?: string;
  startTime: number;
  endTime?: number;
}

// Overall progress state interface
export interface OverallProgressState {
  stage: "extract" | "analyze" | "complete" | "error";
  progress: number;
  message: string;
  filesTotal: number;
  filesCompleted: number;
  filesErrored: number;
  startTime: number;
  endTime?: number;
  estimatedTimeRemaining?: number;
}

// Progress tracker class for managing import progress
export class ProgressTracker {
  private fileProgress: Map<string, FileProgressState> = new Map();
  private overallProgressStore: Writable<OverallProgressState>;
  private fileProgressStore: Writable<Map<string, FileProgressState>>;

  constructor() {
    this.overallProgressStore = writable({
      stage: "extract",
      progress: 0,
      message: "Preparing to process files...",
      filesTotal: 0,
      filesCompleted: 0,
      filesErrored: 0,
      startTime: Date.now(),
    });

    this.fileProgressStore = writable(new Map());
  }

  // Initialize tracking for files
  initializeFiles(files: File[]): void {
    this.fileProgress.clear();

    for (const file of files) {
      const fileId = this.generateFileId(file);
      const progressState: FileProgressState = {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        stage: "extract",
        progress: 0,
        message: "Preparing file...",
        startTime: Date.now(),
      };

      this.fileProgress.set(fileId, progressState);
    }

    this.updateStores();
    this.updateOverallProgress();
  }

  // Update progress for a specific file
  updateFileProgress(event: SSEProgressEvent): void {
    if (!event.fileId) return;

    const current = this.fileProgress.get(event.fileId);
    if (!current) return;

    const updated: FileProgressState = {
      ...current,
      stage: this.parseStage(event.stage),
      progress: Math.max(0, Math.min(100, event.progress)),
      message: event.message,
      error: event.type === "error" ? event.message : undefined,
      endTime: event.type === "complete" ? Date.now() : current.endTime,
    };

    this.fileProgress.set(event.fileId, updated);
    this.updateStores();
    this.updateOverallProgress();
  }

  // Update overall progress based on file progress
  private updateOverallProgress(): void {
    const files = Array.from(this.fileProgress.values());
    const totalFiles = files.length;

    if (totalFiles === 0) return;

    const completedFiles = files.filter((f) => f.stage === "complete").length;
    const erroredFiles = files.filter((f) => f.stage === "error").length;
    const extractingFiles = files.filter((f) => f.stage === "extract").length;
    const analyzingFiles = files.filter((f) => f.stage === "analyze").length;

    // Determine current stage
    let currentStage: OverallProgressState["stage"] = "extract";
    if (completedFiles === totalFiles) {
      currentStage = "complete";
    } else if (erroredFiles === totalFiles) {
      currentStage = "error";
    } else if (extractingFiles === 0 && analyzingFiles > 0) {
      currentStage = "analyze";
    }

    // Calculate overall progress
    let overallProgress = 0;
    if (currentStage === "extract") {
      // Extraction phase: 0-50%
      const extractProgress =
        files.reduce((sum, f) => {
          return sum + (f.stage === "extract" ? f.progress : 100);
        }, 0) / totalFiles;
      overallProgress = (extractProgress / 100) * 50;
    } else if (currentStage === "analyze") {
      // Analysis phase: 50-100%
      const analyzeProgress =
        files.reduce((sum, f) => {
          return sum + (f.stage === "analyze" ? f.progress : 100);
        }, 0) / totalFiles;
      overallProgress = 50 + (analyzeProgress / 100) * 50;
    } else if (currentStage === "complete") {
      overallProgress = 100;
    }

    // Generate current message
    let message = this.generateOverallMessage(currentStage, files);

    // Calculate estimated time remaining
    const estimatedTimeRemaining = this.calculateEstimatedTime(files);

    this.overallProgressStore.update((current) => ({
      ...current,
      stage: currentStage,
      progress: Math.max(0, Math.min(100, overallProgress)),
      message,
      filesTotal: totalFiles,
      filesCompleted: completedFiles,
      filesErrored: erroredFiles,
      estimatedTimeRemaining,
      endTime: currentStage === "complete" ? Date.now() : undefined,
    }));
  }

  // Generate overall progress message
  private generateOverallMessage(
    stage: string,
    files: FileProgressState[],
  ): string {
    const totalFiles = files.length;
    const completedFiles = files.filter((f) => f.stage === "complete").length;
    const erroredFiles = files.filter((f) => f.stage === "error").length;

    switch (stage) {
      case "extract":
        return `Extracting text from ${totalFiles} file${totalFiles > 1 ? "s" : ""}...`;
      case "analyze":
        return `Analyzing medical content in ${totalFiles - completedFiles} file${totalFiles - completedFiles > 1 ? "s" : ""}...`;
      case "complete":
        return `Successfully processed ${completedFiles} file${completedFiles > 1 ? "s" : ""}!`;
      case "error":
        if (erroredFiles === totalFiles) {
          return "All files failed to process. Please try again.";
        } else {
          return `${erroredFiles} file${erroredFiles > 1 ? "s" : ""} failed to process.`;
        }
      default:
        return "Processing files...";
    }
  }

  // Calculate estimated time remaining
  private calculateEstimatedTime(
    files: FileProgressState[],
  ): number | undefined {
    const inProgressFiles = files.filter(
      (f) => ["extract", "analyze"].includes(f.stage) && f.progress > 0,
    );

    if (inProgressFiles.length === 0) return undefined;

    const now = Date.now();
    let totalEstimate = 0;
    let validEstimates = 0;

    for (const file of inProgressFiles) {
      const elapsed = now - file.startTime;
      const progressDecimal = file.progress / 100;

      if (progressDecimal > 0.05) {
        // Only estimate after 5% progress
        const estimatedTotal = elapsed / progressDecimal;
        const remaining = estimatedTotal - elapsed;
        totalEstimate += remaining;
        validEstimates++;
      }
    }

    return validEstimates > 0 ? totalEstimate / validEstimates : undefined;
  }

  // Parse stage from event
  private parseStage(stage: string): FileProgressState["stage"] {
    if (stage.includes("extract") || stage.includes("ocr")) return "extract";
    if (stage.includes("analyz") || stage.includes("medical")) return "analyze";
    if (stage.includes("complete")) return "complete";
    if (stage.includes("error")) return "error";
    return "extract"; // default
  }

  // Generate unique file ID
  private generateFileId(file: File): string {
    return `${file.name}-${file.size}-${Date.now()}`;
  }

  // Update stores
  private updateStores(): void {
    this.fileProgressStore.set(new Map(this.fileProgress));
  }

  // Get progress stores for reactive updates
  getOverallProgressStore(): Writable<OverallProgressState> {
    return this.overallProgressStore;
  }

  getFileProgressStore(): Writable<Map<string, FileProgressState>> {
    return this.fileProgressStore;
  }

  // Get current progress snapshot
  getCurrentProgress(): {
    overall: OverallProgressState;
    files: Map<string, FileProgressState>;
  } {
    let overall: OverallProgressState;
    let files: Map<string, FileProgressState>;

    this.overallProgressStore.subscribe((value) => (overall = value))();
    this.fileProgressStore.subscribe((value) => (files = value))();

    return { overall: overall!, files: files! };
  }

  // Reset progress tracker
  reset(): void {
    this.fileProgress.clear();

    this.overallProgressStore.set({
      stage: "extract",
      progress: 0,
      message: "Preparing to process files...",
      filesTotal: 0,
      filesCompleted: 0,
      filesErrored: 0,
      startTime: Date.now(),
    });

    this.fileProgressStore.set(new Map());
  }

  // Mark file as complete
  markFileComplete(fileId: string, data?: any): void {
    const file = this.fileProgress.get(fileId);
    if (file) {
      this.fileProgress.set(fileId, {
        ...file,
        stage: "complete",
        progress: 100,
        message: "Processing complete",
        endTime: Date.now(),
      });

      this.updateStores();
      this.updateOverallProgress();
    }
  }

  // Mark file as error
  markFileError(fileId: string, error: string): void {
    const file = this.fileProgress.get(fileId);
    if (file) {
      this.fileProgress.set(fileId, {
        ...file,
        stage: "error",
        message: "Processing failed",
        error,
        endTime: Date.now(),
      });

      this.updateStores();
      this.updateOverallProgress();
    }
  }

  // Get file by ID
  getFile(fileId: string): FileProgressState | undefined {
    return this.fileProgress.get(fileId);
  }

  // Get all files
  getAllFiles(): FileProgressState[] {
    return Array.from(this.fileProgress.values());
  }

  // Get files by stage
  getFilesByStage(stage: FileProgressState["stage"]): FileProgressState[] {
    return this.getAllFiles().filter((f) => f.stage === stage);
  }

  // Check if all files are complete
  isComplete(): boolean {
    const files = this.getAllFiles();
    return files.length > 0 && files.every((f) => f.stage === "complete");
  }

  // Check if any files have errors
  hasErrors(): boolean {
    return this.getAllFiles().some((f) => f.stage === "error");
  }

  // Get processing statistics
  getStats(): {
    totalFiles: number;
    completedFiles: number;
    erroredFiles: number;
    inProgressFiles: number;
    averageProcessingTime: number;
    totalProcessingTime: number;
  } {
    const files = this.getAllFiles();
    const completed = files.filter((f) => f.stage === "complete");
    const errored = files.filter((f) => f.stage === "error");
    const inProgress = files.filter((f) =>
      ["extract", "analyze"].includes(f.stage),
    );

    const processingTimes = completed
      .filter((f) => f.endTime)
      .map((f) => f.endTime! - f.startTime);

    const averageProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) /
          processingTimes.length
        : 0;

    const totalProcessingTime = processingTimes.reduce(
      (sum, time) => sum + time,
      0,
    );

    return {
      totalFiles: files.length,
      completedFiles: completed.length,
      erroredFiles: errored.length,
      inProgressFiles: inProgress.length,
      averageProcessingTime,
      totalProcessingTime,
    };
  }
}

// Create singleton instance
export const progressTracker = new ProgressTracker();

// Utility function to format time duration
export function formatDuration(milliseconds: number): string {
  const seconds = Math.round(milliseconds / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

// Utility function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
