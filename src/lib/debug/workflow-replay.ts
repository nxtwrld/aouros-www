import type { WorkflowRecording, WorkflowStep } from "./workflow-recorder";
import { workflowRecorder } from "./workflow-recorder";
import type { DocumentProcessingState } from "$lib/langgraph/state";
import { log } from "$lib/logging/logger";
import { sleep } from "$lib/utils";

/**
 * Workflow Replay System
 *
 * Provides step-by-step replay functionality for recorded workflows:
 * - Load and replay complete workflows
 * - Step through individual workflow steps
 * - Restore state at any point in the workflow
 * - Compare results between recorded and live runs
 */

export interface ReplayOptions {
  stepDelay?: number; // Delay between steps in ms (overrides environment config)
  stopAtStep?: string; // Stop replay at specific step
  skipSteps?: string[]; // Skip specific steps
  compareMode?: boolean; // Compare with live execution
  verbose?: boolean; // Detailed logging
  useEnvironmentDelay?: boolean; // Use delay from environment variable (default: true)
}

export interface ReplayResult {
  stepId: string;
  stepName: string;
  recordedState: Partial<DocumentProcessingState>;
  replayedState?: Partial<DocumentProcessingState>;
  differences?: any;
  success: boolean;
  error?: string;
}

export class WorkflowReplay {
  private recording: WorkflowRecording | null = null;
  private currentStepIndex: number = 0;
  private replayResults: ReplayResult[] = [];

  /**
   * Load a workflow recording for replay
   */
  loadWorkflow(filePath: string): boolean {
    this.recording = workflowRecorder.loadRecording(filePath);
    this.currentStepIndex = 0;
    this.replayResults = [];

    if (!this.recording) {
      log.analysis.error("Failed to load workflow for replay", { filePath });
      return false;
    }

    log.analysis.info("Workflow loaded for replay", {
      recordingId: this.recording.recordingId,
      phase: this.recording.phase,
      totalSteps: this.recording.steps.length,
      recordedAt: this.recording.timestamp,
    });

    return true;
  }

  /**
   * Get the initial state for replay
   */
  getInitialState(): Partial<DocumentProcessingState> {
    if (!this.recording) {
      throw new Error("No workflow loaded for replay");
    }

    // Build initial state from recording input
    return {
      images: this.recording.input.images,
      text: this.recording.input.text,
      language: this.recording.input.language,
      content: [],
      tokenUsage: { total: 0 },
      metadata: this.recording.input.metadata,
    };
  }

  /**
   * Get the next step in the workflow
   */
  getNextStep(): WorkflowStep | null {
    if (
      !this.recording ||
      this.currentStepIndex >= this.recording.steps.length
    ) {
      return null;
    }

    return this.recording.steps[this.currentStepIndex];
  }

  /**
   * Execute the next step and return the recorded output state
   */
  executeNextStep(): ReplayResult | null {
    const step = this.getNextStep();
    if (!step) return null;

    log.analysis.info("Replaying workflow step", {
      stepId: step.stepId,
      stepName: step.stepName,
      index: this.currentStepIndex + 1,
      total: this.recording!.steps.length,
    });

    const result: ReplayResult = {
      stepId: step.stepId,
      stepName: step.stepName,
      recordedState: step.outputState,
      success: true,
    };

    this.replayResults.push(result);
    this.currentStepIndex++;

    return result;
  }

  /**
   * Replay the entire workflow and reconstruct the final state
   */
  async replayWorkflowWithStateReconstruction(
    options: ReplayOptions = {},
  ): Promise<{
    finalState: Partial<DocumentProcessingState>;
    replayResults: ReplayResult[];
    recording: WorkflowRecording;
  }> {
    if (!this.recording) {
      throw new Error("No workflow loaded for replay");
    }

    // Start with the initial state
    let currentState = this.getInitialState();
    const results: ReplayResult[] = [];

    const {
      stepDelay,
      stopAtStep,
      skipSteps = [],
      verbose = false,
      useEnvironmentDelay = true,
    } = options;

    // Determine the delay to use
    let delayMs = stepDelay;
    if (delayMs === undefined && useEnvironmentDelay) {
      delayMs = workflowRecorder.getReplayDelay();
    } else if (delayMs === undefined) {
      delayMs = 500;
    }

    log.analysis.info("Starting workflow replay with state reconstruction", {
      recordingId: this.recording.recordingId,
      totalSteps: this.recording.steps.length,
      stepDelay: delayMs,
      stopAtStep,
      skipSteps,
      useEnvironmentDelay,
    });

    // Replay each step and build up the state progressively
    for (let i = 0; i < this.recording.steps.length; i++) {
      const step = this.recording.steps[i];

      // Check if we should stop at this step
      if (stopAtStep && step.stepName === stopAtStep) {
        log.analysis.info("Stopping replay at requested step", {
          stepName: stopAtStep,
        });
        break;
      }

      // Skip steps if requested
      if (skipSteps.includes(step.stepName)) {
        if (verbose) {
          log.analysis.debug("Skipping step", { stepName: step.stepName });
        }
        continue;
      }

      if (verbose) {
        log.analysis.debug("Replaying step with state reconstruction", {
          stepId: step.stepId,
          stepName: step.stepName,
          duration: step.duration,
          tokenUsage: step.tokenUsage.total,
        });
      }

      // Execute the step to get the result
      const result = this.executeNextStep();
      if (result) {
        results.push(result);

        // Apply the recorded outputState to build the progressive state
        // This reconstructs the state as it would have been after each step
        currentState = {
          ...currentState,
          ...result.recordedState,
        };

        if (verbose) {
          log.analysis.debug("State updated after step", {
            stepName: step.stepName,
            stateKeys: Object.keys(currentState),
            hasSignals: !!currentState.signals?.length,
            hasMedicalAnalysis: !!currentState.medicalAnalysis,
            tokenUsage: currentState.tokenUsage?.total,
          });
        }
      }

      // Add delay between steps
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }

    log.analysis.info("Workflow replay with state reconstruction completed", {
      totalSteps: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      finalStateKeys: Object.keys(currentState),
    });

    return {
      finalState: currentState,
      replayResults: results,
      recording: this.recording,
    };
  }

  /**
   * Replay the entire workflow automatically
   */
  async replayWorkflow(options: ReplayOptions = {}): Promise<ReplayResult[]> {
    if (!this.recording) {
      throw new Error("No workflow loaded for replay");
    }

    const results: ReplayResult[] = [];
    const {
      stepDelay,
      stopAtStep,
      skipSteps = [],
      verbose = false,
      useEnvironmentDelay = true,
    } = options;

    // Determine the delay to use
    let delayMs = stepDelay;
    if (delayMs === undefined && useEnvironmentDelay) {
      // Get delay from environment configuration
      delayMs = workflowRecorder.getReplayDelay();
    } else if (delayMs === undefined) {
      // Default fallback
      delayMs = 500;
    }

    log.analysis.info("Starting automatic workflow replay", {
      recordingId: this.recording.recordingId,
      totalSteps: this.recording.steps.length,
      stepDelay: delayMs,
      stopAtStep,
      skipSteps,
      useEnvironmentDelay,
    });

    for (let i = 0; i < this.recording.steps.length; i++) {
      const step = this.recording.steps[i];

      // Check if we should stop at this step
      if (stopAtStep && step.stepName === stopAtStep) {
        log.analysis.info("Stopping replay at requested step", {
          stepName: stopAtStep,
        });
        break;
      }

      // Skip steps if requested
      if (skipSteps.includes(step.stepName)) {
        if (verbose) {
          log.analysis.debug("Skipping step", { stepName: step.stepName });
        }
        continue;
      }

      if (verbose) {
        log.analysis.debug("Replaying step", {
          stepId: step.stepId,
          stepName: step.stepName,
          duration: step.duration,
          tokenUsage: step.tokenUsage.total,
        });
      }

      const result = this.executeNextStep();
      if (result) {
        results.push(result);
      }

      // Add delay between steps
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }

    log.analysis.info("Workflow replay completed", {
      totalSteps: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return results;
  }

  /**
   * Get state at a specific step
   */
  getStateAtStep(stepName: string): Partial<DocumentProcessingState> | null {
    if (!this.recording) return null;

    const step = this.recording.steps.find((s) => s.stepName === stepName);
    return step ? step.outputState : null;
  }

  /**
   * Restore workflow to a specific step
   */
  restoreToStep(stepName: string): boolean {
    if (!this.recording) return false;

    const stepIndex = this.recording.steps.findIndex(
      (s) => s.stepName === stepName,
    );
    if (stepIndex === -1) return false;

    this.currentStepIndex = stepIndex;
    log.analysis.info("Workflow restored to step", {
      stepName,
      index: stepIndex,
    });

    return true;
  }

  /**
   * Get workflow summary
   */
  getWorkflowSummary(): any {
    if (!this.recording) return null;

    return {
      recordingId: this.recording.recordingId,
      phase: this.recording.phase,
      timestamp: this.recording.timestamp,
      totalSteps: this.recording.steps.length,
      totalDuration: this.recording.totalDuration,
      totalTokenUsage: this.recording.totalTokenUsage,
      input: this.recording.input,
      steps: this.recording.steps.map((step) => ({
        stepId: step.stepId,
        stepName: step.stepName,
        duration: step.duration,
        tokenUsage: step.tokenUsage.total,
        hasErrors: step.errors && step.errors.length > 0,
        aiRequestsCount: step.aiRequests?.length || 0,
      })),
    };
  }

  /**
   * Compare two workflow states
   */
  compareStates(state1: any, state2: any): any {
    const differences: any = {};

    // Simple deep comparison for demonstration
    // In production, you might want a more sophisticated diff algorithm
    const compare = (obj1: any, obj2: any, path: string = "") => {
      if (typeof obj1 !== typeof obj2) {
        differences[path] = {
          recorded: obj1,
          live: obj2,
          type: "type_mismatch",
        };
        return;
      }

      if (obj1 === null || obj2 === null) {
        if (obj1 !== obj2) {
          differences[path] = {
            recorded: obj1,
            live: obj2,
            type: "null_mismatch",
          };
        }
        return;
      }

      if (typeof obj1 === "object") {
        const keys1 = Object.keys(obj1 || {});
        const keys2 = Object.keys(obj2 || {});
        const allKeys = new Set([...keys1, ...keys2]);

        for (const key of allKeys) {
          const newPath = path ? `${path}.${key}` : key;
          if (!(key in obj1)) {
            differences[newPath] = {
              recorded: undefined,
              live: obj2[key],
              type: "missing_in_recorded",
            };
          } else if (!(key in obj2)) {
            differences[newPath] = {
              recorded: obj1[key],
              live: undefined,
              type: "missing_in_live",
            };
          } else {
            compare(obj1[key], obj2[key], newPath);
          }
        }
      } else if (obj1 !== obj2) {
        differences[path] = {
          recorded: obj1,
          live: obj2,
          type: "value_mismatch",
        };
      }
    };

    compare(state1, state2);
    return differences;
  }

  /**
   * Export replay results for analysis
   */
  exportResults(): any {
    return {
      recording: this.recording,
      replayResults: this.replayResults,
      summary: this.getWorkflowSummary(),
    };
  }

  /**
   * Reset replay state
   */
  reset() {
    this.currentStepIndex = 0;
    this.replayResults = [];
  }
}

// Helper function to create a replay session
export function createWorkflowReplay(filePath: string): WorkflowReplay | null {
  const replay = new WorkflowReplay();
  if (replay.loadWorkflow(filePath)) {
    return replay;
  }
  return null;
}

// Helper function to replay a workflow with full state reconstruction
export async function replayWorkflowWithStateReconstruction(
  filePath: string,
  options: ReplayOptions = {},
): Promise<{
  finalState: Partial<DocumentProcessingState>;
  replayResults: ReplayResult[];
  recording: WorkflowRecording;
} | null> {
  const replay = createWorkflowReplay(filePath);
  if (!replay) {
    return null;
  }

  return await replay.replayWorkflowWithStateReconstruction(options);
}

// Helper function to get available recordings
export function getAvailableRecordings(): string[] {
  const fs = require("fs");
  const path = require("path");

  const debugDir = path.join(process.cwd(), "test-data", "workflows");

  try {
    if (!fs.existsSync(debugDir)) {
      return [];
    }

    return fs
      .readdirSync(debugDir)
      .filter((file: string) => file.endsWith(".json"))
      .map((file: string) => path.join(debugDir, file));
  } catch (error) {
    log.analysis.error("Failed to get available recordings", error);
    return [];
  }
}
