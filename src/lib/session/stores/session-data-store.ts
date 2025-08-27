import { writable, derived, get, readable } from "svelte/store";
import type { Writable, Readable } from "svelte/store";
import type {
  SessionAnalysis,
  ActionNode,
} from "$components/session/types/visualization";
import {
  transformToSankeyData,
  applySankeyThresholds,
} from "$components/session/utils/sankeyDataTransformer";
import {
  QUESTION_SCORING,
  type QuestionCategory,
} from "$lib/session/constants";

// Types for derived calculations
interface RelationshipIndex {
  forward: Map<
    string,
    Set<{
      targetId: string;
      type: string;
      confidence: number;
      targetType: string;
    }>
  >;
  reverse: Map<
    string,
    Set<{
      sourceId: string;
      type: string;
      confidence: number;
      sourceType: string;
    }>
  >;
  nodeTypes: Map<string, string>;
}

interface PathCalculation {
  trigger: { type: "node" | "link"; id: string; item: any };
  path: { nodes: string[]; links: string[] };
}

interface SessionComputedData {
  sessionData: SessionAnalysis;
  relationshipIndex: RelationshipIndex;
  nodeMap: Map<string, any>;
  linkMap: Map<string, any>;
  isLoading: boolean;
  error: string | null;
}

// Store 1: Session Data Store (immutable data + derived calculations)
const sessionDataStore: Writable<SessionComputedData | null> = writable(null);

/**
 * Builds the relationship index for efficient lookups
 */
function buildRelationshipIndex(
  sessionData: SessionAnalysis,
): RelationshipIndex {
  const index: RelationshipIndex = {
    forward: new Map(),
    reverse: new Map(),
    nodeTypes: new Map(),
  };

  // Helper to add a node to the type map
  const addNodeType = (nodeId: string, nodeType: string) => {
    index.nodeTypes.set(nodeId, nodeType);
  };

  // Process all node types
  const nodeGroups = [
    { nodes: sessionData.nodes.symptoms || [], type: "symptom" },
    { nodes: sessionData.nodes.diagnoses || [], type: "diagnosis" },
    { nodes: sessionData.nodes.treatments || [], type: "treatment" },
    { nodes: sessionData.nodes.actions || [], type: "action" },
  ];

  // FIRST PASS: Register all node types
  for (const group of nodeGroups) {
    for (const node of group.nodes) {
      addNodeType(node.id, group.type);
    }
  }

  // SECOND PASS: Process relationships (now all node types are registered)
  for (const group of nodeGroups) {
    for (const node of group.nodes) {
      // Process relationships if they exist
      if (node.relationships) {
        for (const rel of node.relationships) {
          const targetType = index.nodeTypes.get(rel.nodeId) || "unknown";

          // Handle relationship direction
          if (
            rel.direction === "outgoing" ||
            rel.direction === "bidirectional"
          ) {
            // Add to forward map (this node -> target)
            if (!index.forward.has(node.id)) {
              index.forward.set(node.id, new Set());
            }
            index.forward.get(node.id)!.add({
              targetId: rel.nodeId,
              type: rel.relationship,
              confidence: (rel as any).confidence ?? 1.0,
              targetType,
            });

            // ALSO add to reverse map (target <- this node) - KEY DIFFERENCE from old broken logic
            if (!index.reverse.has(rel.nodeId)) {
              index.reverse.set(rel.nodeId, new Set());
            }
            index.reverse.get(rel.nodeId)!.add({
              sourceId: node.id,
              type: rel.relationship,
              confidence: (rel as any).confidence ?? 1.0,
              sourceType: group.type,
            });
          }

          if (
            rel.direction === "incoming" ||
            rel.direction === "bidirectional"
          ) {
            // Add to forward map (target -> this node) - reverse of what's defined
            if (!index.forward.has(rel.nodeId)) {
              index.forward.set(rel.nodeId, new Set());
            }
            index.forward.get(rel.nodeId)!.add({
              targetId: node.id,
              type: rel.relationship,
              confidence: (rel as any).confidence ?? 1.0,
              targetType: group.type,
            });

            // Add to reverse map (this node <- target)
            if (!index.reverse.has(node.id)) {
              index.reverse.set(node.id, new Set());
            }
            index.reverse.get(node.id)!.add({
              sourceId: rel.nodeId,
              type: rel.relationship,
              confidence: (rel as any).confidence ?? 1.0,
              sourceType: targetType,
            });
          }
        }
      }
    }
  }

  // Build additional forward relationships from reverse relationships
  // IMPORTANT: Don't overwrite existing forward relationships, merge them
  for (const [nodeId, relationships] of index.reverse.entries()) {
    // Get existing forward relationships or create new set
    if (!index.forward.has(nodeId)) {
      index.forward.set(nodeId, new Set());
    }
    const existingRels = index.forward.get(nodeId)!;

    // Add reverse relationships as forward relationships
    for (const rel of relationships) {
      existingRels.add({
        targetId: rel.sourceId,
        type: rel.type, // Keep this as rel.type since we're building it from existing relationship objects
        confidence: rel.confidence,
        targetType: index.nodeTypes.get(rel.sourceId) || "unknown",
      });
    }
  }

  // Relationship index built successfully

  return index;
}

/**
 * Builds node and link maps for quick lookups
 */
function buildNodeAndLinkMaps(sessionData: SessionAnalysis): {
  nodeMap: Map<string, any>;
  linkMap: Map<string, any>;
} {
  const nodeMap = new Map<string, any>();
  const linkMap = new Map<string, any>();

  // Build node map
  const allNodeGroups = [
    ...(sessionData.nodes.symptoms || []),
    ...(sessionData.nodes.diagnoses || []),
    ...(sessionData.nodes.treatments || []),
    ...(sessionData.nodes.actions || []),
  ];

  allNodeGroups.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  // Build link map (if links exist)
  if ((sessionData as any).links) {
    (sessionData as any).links.forEach((link: any) => {
      const linkId = `${link.sourceId}-${link.targetId}`;
      linkMap.set(linkId, link);
    });
  }

  return { nodeMap, linkMap };
}

/**
 * Actions for managing session data
 */
export const sessionDataActions = {
  /**
   * Load new session data and compute all derived data
   */
  loadSession(sessionData: SessionAnalysis): void {
    // Build all derived data
    const relationshipIndex = buildRelationshipIndex(sessionData);
    const { nodeMap, linkMap } = buildNodeAndLinkMaps(sessionData);

    const computedData: SessionComputedData = {
      sessionData,
      relationshipIndex,
      nodeMap,
      linkMap,
      isLoading: false,
      error: null,
    };

    sessionDataStore.set(computedData);
  },

  /**
   * Get path calculation (pure function, no mutations)
   */
  calculatePath(nodeId: string): PathCalculation | null {
    const data = get(sessionDataStore);
    if (!data) return null;

    // Calculate path without mutating store
    const pathCalculation = calculatePathFromNode(nodeId, data);

    return pathCalculation;
  },

  /**
   * Clear the session data
   */
  clearSession(): void {
    sessionDataStore.set(null);
  },

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const data = get(sessionDataStore);
    if (!data?.sessionData?.nodes?.actions) return;

    const updatedActions = data.sessionData.nodes.actions.map(
      (action: ActionNode) =>
        action.id === alertId && action.actionType === "alert"
          ? { ...action, status: "acknowledged" as const }
          : action,
    );

    const updatedSessionData = {
      ...data.sessionData,
      nodes: {
        ...data.sessionData.nodes,
        actions: updatedActions,
      },
    };

    this.loadSession(updatedSessionData);
  },

  /**
   * Answer a question
   */
  answerQuestion(
    questionId: string,
    answer: string,
    confidence?: number,
  ): void {
    const data = get(sessionDataStore);
    if (!data?.sessionData?.nodes?.actions) return;

    const updatedActions = data.sessionData.nodes.actions.map(
      (action: ActionNode) =>
        action.id === questionId && action.actionType === "question"
          ? { ...action, status: "answered" as const, answer, confidence }
          : action,
    );

    const updatedSessionData = {
      ...data.sessionData,
      nodes: {
        ...data.sessionData.nodes,
        actions: updatedActions,
      },
    };

    this.loadSession(updatedSessionData);
  },

  /**
   * Node lookup utilities
   */
  findNodeById(nodeId: string): any {
    const data = get(sessionDataStore);
    if (!data?.nodeMap) return null;
    return data.nodeMap.get(nodeId) || null;
  },

  getNodeDisplayText(nodeId: string): string {
    const node = this.findNodeById(nodeId);
    if (!node) return nodeId;

    return node.name || node.text || nodeId;
  },

  /**
   * Handle node actions (suppress, etc.)
   */
  handleNodeAction(action: string, targetId: string, reason?: string): void {
    const data = get(sessionDataStore);
    if (!data?.sessionData) return;

    let updatedSessionData = { ...data.sessionData };

    // Handle different actions
    if (action === "suppress") {
      // Update diagnoses
      if (updatedSessionData.nodes.diagnoses) {
        updatedSessionData.nodes.diagnoses =
          updatedSessionData.nodes.diagnoses.map((diagnosis) =>
            diagnosis.id === targetId
              ? {
                  ...diagnosis,
                  suppressed: true,
                  suppressionReason: reason || "User suppressed",
                }
              : diagnosis,
          );
      }

      // Could handle other node types here
    }

    // Add user action to session history if userActions exists
    if (updatedSessionData.userActions) {
      const userAction = {
        timestamp: new Date().toISOString(),
        action: action as any,
        targetId: targetId,
        reason: reason,
      };

      updatedSessionData.userActions = [
        ...updatedSessionData.userActions,
        userAction,
      ];
    }

    this.loadSession(updatedSessionData);
  },

  /**
   * Update session (alias for loadSession for backwards compatibility)
   */
  updateSession(sessionData: SessionAnalysis): void {
    this.loadSession(sessionData);
  },

  /**
   * Update partial session data (simplified implementation)
   */
  updatePartial(sessionData: SessionAnalysis): void {
    this.loadSession(sessionData);
  },

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    sessionDataStore.update((data) =>
      data ? { ...data, isLoading: loading } : null,
    );
  },

  /**
   * Set error state
   */
  setError(error: string | null): void {
    sessionDataStore.update((data) => (data ? { ...data, error } : null));
  },
};

/**
 * Calculate medical reasoning path from a node using relationship index
 * Follows medical logic: Symptoms → Diagnoses → Treatments
 */
function calculatePathFromNode(
  nodeId: string,
  data: SessionComputedData,
): PathCalculation {
  const { relationshipIndex, nodeMap } = data;

  const pathNodes = new Set<string>();
  const pathLinks = new Set<string>();
  pathNodes.add(nodeId);

  const startingNodeType = relationshipIndex.nodeTypes.get(nodeId) || "unknown";

  // Medical reasoning path calculation based on node type
  switch (startingNodeType) {
    case "treatment":
      calculateTreatmentPath(nodeId, pathNodes, pathLinks, relationshipIndex);
      break;
    case "symptom":
      calculateSymptomPath(nodeId, pathNodes, pathLinks, relationshipIndex);
      break;
    case "diagnosis":
      calculateDiagnosisPath(nodeId, pathNodes, pathLinks, relationshipIndex);
      break;
    default:
      break;
  }

  const nodeItem = nodeMap.get(nodeId);

  return {
    trigger: { type: "node", id: nodeId, item: nodeItem },
    path: {
      nodes: Array.from(pathNodes),
      links: Array.from(pathLinks),
    },
  };
}

/**
 * Calculate path for treatment: Treatment ← Diagnosis ← Symptoms
 * Treatments have incoming relationships from diagnoses they treat
 */
function calculateTreatmentPath(
  treatmentId: string,
  pathNodes: Set<string>,
  pathLinks: Set<string>,
  relationshipIndex: RelationshipIndex,
) {
  // Find diagnoses that this treatment treats (incoming relationships)
  const reverseRels = relationshipIndex.reverse.get(treatmentId);

  // Debug what relationships actually exist for this treatment
  const forwardRels = relationshipIndex.forward.get(treatmentId);

  // Process reverse relationships (diagnoses that require/treat this treatment)
  if (reverseRels) {
    for (const rel of reverseRels) {
      if (rel.sourceType === "diagnosis") {
        pathNodes.add(rel.sourceId);
        pathLinks.add(`${rel.sourceId}-${treatmentId}`);

        // Find symptoms that support this diagnosis
        const diagnosisReverseRels = relationshipIndex.reverse.get(
          rel.sourceId,
        );
        if (diagnosisReverseRels) {
          for (const symptomRel of diagnosisReverseRels) {
            if (symptomRel.sourceType === "symptom") {
              pathNodes.add(symptomRel.sourceId);
              pathLinks.add(`${symptomRel.sourceId}-${rel.sourceId}`);
            }
          }
        }
      }
    }
  }

  // Process forward relationships (what this treatment investigates/clarifies/explores)
  if (forwardRels) {
    for (const rel of forwardRels) {
      if (rel.targetType === "diagnosis") {
        pathNodes.add(rel.targetId);
        // For investigates relationships, the link direction might be reversed visually
        pathLinks.add(`${rel.targetId}-${treatmentId}`);

        // Find symptoms that support the investigated diagnosis
        const diagnosisReverseRels = relationshipIndex.reverse.get(
          rel.targetId,
        );
        if (diagnosisReverseRels) {
          for (const symptomRel of diagnosisReverseRels) {
            if (symptomRel.sourceType === "symptom") {
              pathNodes.add(symptomRel.sourceId);
              pathLinks.add(`${symptomRel.sourceId}-${rel.targetId}`);
            }
          }
        }
      }
    }
  }
}

/**
 * Calculate path for symptom: Symptoms → Diagnosis → Treatments
 * Symptoms have outgoing relationships to diagnoses they support
 */
function calculateSymptomPath(
  symptomId: string,
  pathNodes: Set<string>,
  pathLinks: Set<string>,
  relationshipIndex: RelationshipIndex,
) {
  // Find diagnoses that this symptom supports (outgoing relationships)
  const forwardRels = relationshipIndex.forward.get(symptomId);
  if (forwardRels) {
    for (const rel of forwardRels) {
      if (rel.targetType === "diagnosis") {
        pathNodes.add(rel.targetId);
        pathLinks.add(`${symptomId}-${rel.targetId}`);

        // Find treatments that this diagnosis requires
        const diagnosisForwardRels = relationshipIndex.forward.get(
          rel.targetId,
        );
        if (diagnosisForwardRels) {
          for (const treatmentRel of diagnosisForwardRels) {
            if (treatmentRel.targetType === "treatment") {
              pathNodes.add(treatmentRel.targetId);
              pathLinks.add(`${rel.targetId}-${treatmentRel.targetId}`);
            }
          }
        }
      }
    }
  }
}

/**
 * Calculate path for diagnosis: Symptoms → Diagnosis → Treatments
 * Diagnoses connect symptoms (incoming) with treatments (outgoing)
 */
function calculateDiagnosisPath(
  diagnosisId: string,
  pathNodes: Set<string>,
  pathLinks: Set<string>,
  relationshipIndex: RelationshipIndex,
) {
  // Find symptoms that support this diagnosis (incoming relationships)
  const reverseRels = relationshipIndex.reverse.get(diagnosisId);
  if (reverseRels) {
    for (const rel of reverseRels) {
      if (rel.sourceType === "symptom") {
        pathNodes.add(rel.sourceId);
        pathLinks.add(`${rel.sourceId}-${diagnosisId}`);
      }
    }
  }

  // Find treatments that this diagnosis requires (outgoing relationships)
  const forwardRels = relationshipIndex.forward.get(diagnosisId);
  if (forwardRels) {
    for (const rel of forwardRels) {
      if (rel.targetType === "treatment") {
        pathNodes.add(rel.targetId);
        pathLinks.add(`${diagnosisId}-${rel.targetId}`);
      }
    }
  }
}

// Exported stores and derived stores
export const sessionData: Readable<SessionAnalysis | null> = derived(
  sessionDataStore,
  ($store) => $store?.sessionData || null,
);

export const sankeyData: Readable<any | null> = readable<any | null>(
  null,
  (set) => {
    let lastSessionRef: SessionAnalysis | null = null;

    const unsubscribe = sessionDataStore.subscribe(($store) => {
      const nextSession = $store?.sessionData || null;
      if (nextSession !== lastSessionRef) {
        lastSessionRef = nextSession;
        set(nextSession ? transformToSankeyData(nextSession) : null);
      }
    });

    return unsubscribe;
  },
);

export const relationshipIndex: Readable<RelationshipIndex | null> = derived(
  sessionDataStore,
  ($store) => $store?.relationshipIndex || null,
);

export const nodeMap: Readable<Map<string, any> | null> = derived(
  sessionDataStore,
  ($store) => $store?.nodeMap || null,
);

export const linkMap: Readable<Map<string, any> | null> = derived(
  sessionDataStore,
  ($store) => $store?.linkMap || null,
);

export const isLoading: Readable<boolean> = derived(
  sessionDataStore,
  ($store) => $store?.isLoading || false,
);

export const error: Readable<string | null> = derived(
  sessionDataStore,
  ($store) => $store?.error || null,
);

// Factory function for node-specific questions and alerts
export function questionsForNode(nodeId: string): Readable<ActionNode[]> {
  return derived(sessionData, ($sessionData) => {
    if (!$sessionData?.nodes?.actions) return [];

    return $sessionData.nodes.actions.filter(
      (action: ActionNode) =>
        action.actionType === "question" &&
        action.relationships?.some((rel: any) => rel.nodeId === nodeId),
    );
  });
}

export function alertsForNode(nodeId: string): Readable<ActionNode[]> {
  return derived(sessionData, ($sessionData) => {
    if (!$sessionData?.nodes?.actions) return [];

    return $sessionData.nodes.actions.filter(
      (action: ActionNode) =>
        action.actionType === "alert" &&
        action.relationships?.some((rel: any) => rel.nodeId === nodeId),
    );
  });
}

// Additional derived stores for actions
export const questions: Readable<ActionNode[]> = derived(
  sessionData,
  ($sessionData) =>
    $sessionData?.nodes?.actions?.filter(
      (action: ActionNode) => action.actionType === "question",
    ) || [],
);

export const alerts: Readable<ActionNode[]> = derived(
  sessionData,
  ($sessionData) =>
    $sessionData?.nodes?.actions?.filter(
      (action: ActionNode) => action.actionType === "alert",
    ) || [],
);

export const pendingQuestions: Readable<ActionNode[]> = derived(
  questions,
  ($questions) => $questions.filter((q) => q.status === "pending"),
);

export const pendingAlerts: Readable<ActionNode[]> = derived(
  alerts,
  ($alerts) => $alerts.filter((a) => a.status === "pending"),
);

// Factory functions for link-related actions
export function questionsForLink(link: any): Readable<ActionNode[]> {
  return derived(sessionData, ($sessionData) => {
    if (!$sessionData?.nodes?.actions || !link) return [];

    const sourceId =
      typeof link.source === "object" ? link.source.id : link.source;
    const targetId =
      typeof link.target === "object" ? link.target.id : link.target;

    return $sessionData.nodes.actions.filter(
      (action: ActionNode) =>
        action.actionType === "question" &&
        action.relationships?.some(
          (rel: any) => rel.nodeId === sourceId || rel.nodeId === targetId,
        ),
    );
  });
}

export function alertsForLink(link: any): Readable<ActionNode[]> {
  return derived(sessionData, ($sessionData) => {
    if (!$sessionData?.nodes?.actions || !link) return [];

    const sourceId =
      typeof link.source === "object" ? link.source.id : link.source;
    const targetId =
      typeof link.target === "object" ? link.target.id : link.target;

    return $sessionData.nodes.actions.filter(
      (action: ActionNode) =>
        action.actionType === "alert" &&
        action.relationships?.some(
          (rel: any) => rel.nodeId === sourceId || rel.nodeId === targetId,
        ),
    );
  });
}

/**
 * Calculate composite score for question prioritization
 * Combines urgency, diagnosis relevance, and question priority
 */
function calculateCompositeScore(
  question: ActionNode,
  sessionData: SessionAnalysis,
): number {
  const { URGENCY_SCORES, WEIGHTS, SCALING } = QUESTION_SCORING;

  // 1. Urgency Score (0-10 based on category)
  const urgencyScore =
    URGENCY_SCORES[question.category as QuestionCategory] || 3;

  // 2. Relevance Score - highest probability among related diagnoses
  let maxDiagnosisProbability = 0;
  if (question.impact?.diagnoses && sessionData?.nodes?.diagnoses) {
    const diagnosisMap = new Map(
      sessionData.nodes.diagnoses.map((d) => [d.id, d.probability]),
    );

    Object.entries(question.impact.diagnoses).forEach(([diagnosisId]) => {
      const probability = diagnosisMap.get(diagnosisId) || 0;
      maxDiagnosisProbability = Math.max(maxDiagnosisProbability, probability);
    });
  }

  // 3. Priority Score (invert so lower priority number = higher score)
  const priorityScore = SCALING.PRIORITY_INVERSION - (question.priority || 5);

  // Calculate weighted composite score
  const compositeScore =
    WEIGHTS.URGENCY * urgencyScore +
    WEIGHTS.RELEVANCE *
      maxDiagnosisProbability *
      SCALING.PROBABILITY_MULTIPLIER +
    WEIGHTS.PRIORITY * priorityScore;

  return compositeScore;
}

/**
 * Derived store for questions sorted by composite score
 * Considers urgency, diagnosis probability, and question priority
 */
export const sortedQuestions: Readable<ActionNode[]> = derived(
  [questions, sessionData],
  ([$questions, $sessionData]) => {
    if (!$questions.length || !$sessionData) return $questions;

    return [...$questions].sort((a, b) => {
      const scoreA = calculateCompositeScore(a, $sessionData);
      const scoreB = calculateCompositeScore(b, $sessionData);

      // Sort by highest score first
      return scoreB - scoreA;
    });
  },
);

/**
 * Derived store for pending questions sorted by composite score
 */
export const sortedPendingQuestions: Readable<ActionNode[]> = derived(
  sortedQuestions,
  ($sortedQuestions) => $sortedQuestions.filter((q) => q.status === "pending"),
);

// Export the main store for direct access if needed
export { sessionDataStore };

// Threshold configuration types
interface ThresholdConfig {
  symptoms: { severityThreshold: number; showAll: boolean };
  diagnoses: { probabilityThreshold: number; showAll: boolean };
  treatments: { priorityThreshold: number; showAll: boolean };
}

interface HiddenCounts {
  symptoms: number;
  diagnoses: number;
  treatments: number;
}

// Thresholds store - primary data store (not derived from viewer store)
export const thresholds: Writable<ThresholdConfig> = writable({
  symptoms: { severityThreshold: 7, showAll: false }, // Show severity 1-7 by default
  diagnoses: { probabilityThreshold: 0.35, showAll: false }, // Show probability > 30% by default
  treatments: { priorityThreshold: 10, showAll: true }, // Future use
});

/**
 * Filtered Sankey data with thresholds applied
 * This provides the same interface as sankeyData but with filtering
 */
export const sankeyDataFiltered = derived(
  [sankeyData, thresholds],
  ([$sankeyData, $thresholds]) => {
    if (!$sankeyData || !$thresholds) return $sankeyData;

    const { sankeyData: filteredData } = applySankeyThresholds(
      $sankeyData,
      $thresholds,
    );
    return filteredData;
  },
);

/**
 * Hidden counts calculated reactively from threshold filtering
 */
export const hiddenCounts: Readable<HiddenCounts> = derived(
  [sankeyData, thresholds],
  ([$sankeyData, $thresholds]) => {
    if (!$sankeyData || !$thresholds) {
      return { symptoms: 0, diagnoses: 0, treatments: 0 } as HiddenCounts;
    }

    const { hiddenCounts } = applySankeyThresholds($sankeyData, $thresholds);
    return hiddenCounts;
  },
);

export type { ThresholdConfig, HiddenCounts };
