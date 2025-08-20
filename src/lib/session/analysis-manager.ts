import type {
  SessionAnalysis,
  ActionNode,
  SymptomNode,
  DiagnosisNode,
  TreatmentNode,
  SankeyLink,
  SankeyNode,
  UserAction,
} from "$components/session/types/visualization";
import { sessionDataActions } from "./stores/session-data-store";
import { logger } from "$lib/logging/logger";

/**
 * SessionAnalysisManager - Utility functions for session analysis
 *
 * Provides pure utility functions that don't require reactivity.
 * Filtering and reactive data access is handled by derived stores.
 */
export class SessionAnalysisManager {
  private sessionData: SessionAnalysis | null = null;

  constructor(sessionData?: SessionAnalysis) {
    if (sessionData) {
      this.sessionData = sessionData;
    }
  }

  /**
   * Update the session data this manager operates on
   */
  setSessionData(sessionData: SessionAnalysis): void {
    this.sessionData = sessionData;
  }

  /**
   * Get the current session data
   */
  getSessionData(): SessionAnalysis | null {
    return this.sessionData;
  }

  /**
   * Find a node by ID across all node types
   */
  findNodeById(nodeId: string): any | null {
    if (!this.sessionData?.nodes) return null;

    const allNodes = [
      ...(this.sessionData.nodes.symptoms || []),
      ...(this.sessionData.nodes.diagnoses || []),
      ...(this.sessionData.nodes.treatments || []),
      ...(this.sessionData.nodes.actions || []),
    ];

    return allNodes.find((node) => node.id === nodeId) || null;
  }

  /**
   * Get node type from node data
   */
  getNodeType(nodeData: any): string {
    if ("severity" in nodeData) return "symptom";
    if ("probability" in nodeData) return "diagnosis";
    if (
      "type" in nodeData &&
      [
        "medication",
        "procedure",
        "therapy",
        "lifestyle",
        "investigation",
        "immediate",
      ].includes(nodeData.type)
    )
      return "treatment";
    if ("actionType" in nodeData) return "action";
    return "unknown";
  }

  /**
   * Handle user action to answer a question
   * Updates both local data and the store
   */
  answerQuestion(
    questionId: string,
    answer: string,
    confidence?: number,
  ): void {
    logger.session.info("Answering question", { questionId, answer });

    // Update store
    sessionDataActions.answerQuestion(questionId, answer, confidence);

    // Update local data if we have it
    if (this.sessionData?.nodes?.actions) {
      this.sessionData.nodes.actions = this.sessionData.nodes.actions.map(
        (action) => {
          if (action.id === questionId && action.actionType === "question") {
            return {
              ...action,
              status: "answered" as const,
              answer: answer,
            };
          }
          return action;
        },
      );
    }
  }

  /**
   * Handle user action to acknowledge an alert
   * Updates both local data and the store
   */
  acknowledgeAlert(alertId: string): void {
    logger.session.info("Acknowledging alert", { alertId });

    // Update store
    sessionDataActions.acknowledgeAlert(alertId);

    // Update local data if we have it
    if (this.sessionData?.nodes?.actions) {
      this.sessionData.nodes.actions = this.sessionData.nodes.actions.map(
        (action) => {
          if (action.id === alertId && action.actionType === "alert") {
            return {
              ...action,
              status: "acknowledged" as const,
            };
          }
          return action;
        },
      );
    }
  }

  /**
   * Handle generic node actions (suppress, accept, highlight)
   * Updates both local data and the store
   */
  handleNodeAction(action: string, targetId: string, reason?: string): void {
    logger.session.info("Handling node action", { action, targetId, reason });

    // Update store
    sessionDataActions.handleNodeAction(action, targetId, reason);

    // Update local data if we have it
    if (action === "suppress" && this.sessionData?.nodes?.diagnoses) {
      this.sessionData.nodes.diagnoses = this.sessionData.nodes.diagnoses.map(
        (diagnosis) =>
          diagnosis.id === targetId
            ? {
                ...diagnosis,
                suppressed: true,
                suppressionReason: reason || "User suppressed",
              }
            : diagnosis,
      );
    }
    // Could handle other node types and actions here
  }

  /**
   * Get actions that affect a specific diagnosis based on user answers
   * This remains as a utility since it takes specific parameters
   */
  static getActionsAffectingDiagnosis(
    sessionData: SessionAnalysis,
    diagnosisId: string,
  ): {
    supportingActions: ActionNode[];
    contradictingActions: ActionNode[];
  } {
    if (!sessionData?.nodes?.actions) {
      return { supportingActions: [], contradictingActions: [] };
    }

    const relevantActions = sessionData.nodes.actions.filter((action) => {
      return action.impact?.diagnoses?.[diagnosisId] !== undefined;
    });

    const supportingActions = relevantActions.filter((action) => {
      const impact = action.impact?.diagnoses?.[diagnosisId];
      return impact && impact > 0;
    });

    const contradictingActions = relevantActions.filter((action) => {
      const impact = action.impact?.diagnoses?.[diagnosisId];
      return impact && impact < 0;
    });

    return { supportingActions, contradictingActions };
  }

  /**
   * Validate session data integrity
   */
  static validateSessionData(sessionData: SessionAnalysis): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!sessionData) {
      return { isValid: false, errors: ["No session data provided"] };
    }

    if (!sessionData.sessionId) {
      errors.push("Session ID is missing");
    }

    if (!sessionData.nodes) {
      errors.push("Nodes data is missing");
    }

    // Check for orphaned relationships
    if (sessionData.nodes?.actions) {
      const allNodes = [
        ...(sessionData.nodes.symptoms || []),
        ...(sessionData.nodes.diagnoses || []),
        ...(sessionData.nodes.treatments || []),
        ...(sessionData.nodes.actions || []),
      ];

      sessionData.nodes.actions.forEach((action) => {
        if (action.relationships) {
          action.relationships.forEach((rel) => {
            if (!allNodes.find((n) => n.id === rel.nodeId)) {
              errors.push(
                `Action ${action.id} references non-existent node ${rel.nodeId}`,
              );
            }
          });
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  }
}

/**
 * Create a singleton instance for global use
 */
export const globalAnalysisManager = new SessionAnalysisManager();

/**
 * Factory function to create a manager instance with session data
 */
export function createAnalysisManager(
  sessionData: SessionAnalysis,
): SessionAnalysisManager {
  return new SessionAnalysisManager(sessionData);
}

export default SessionAnalysisManager;
