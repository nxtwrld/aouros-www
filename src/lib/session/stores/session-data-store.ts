import { writable, derived, get, readable } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import { logger } from '$lib/logging/logger';
import type { SessionAnalysis, ActionNode } from '$components/session/types/visualization';
import { transformToSankeyData } from '$components/session/utils/sankeyDataTransformer';

// Types for derived calculations
interface RelationshipIndex {
  forward: Map<string, Set<{ targetId: string; type: string; confidence: number; targetType: string }>>;
  reverse: Map<string, Set<{ sourceId: string; type: string; confidence: number; sourceType: string }>>;
  nodeTypes: Map<string, string>;
}

interface PathCalculation {
  trigger: { type: 'node' | 'link'; id: string; item: any };
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
function buildRelationshipIndex(sessionData: SessionAnalysis): RelationshipIndex {
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

  for (const group of nodeGroups) {
    for (const node of group.nodes) {
      addNodeType(node.id, group.type);

      // Process relationships if they exist
      if (node.relationships) {
        for (const rel of node.relationships) {
          const targetType = index.nodeTypes.get(rel.nodeId) || "unknown";

          // Handle relationship direction
          if (rel.direction === "outgoing" || rel.direction === "bidirectional") {
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
            
            // Debug specifically for treat_thyroid_function_tests
            if (rel.nodeId === 'treat_thyroid_function_tests') {
              logger.session.debug("Adding reverse relationship to treatment from outgoing", {
                treatmentId: rel.nodeId,
                fromNode: node.id,
                fromType: group.type,
                relationshipType: rel.relationship,
                direction: rel.direction
              });
            }
          }

          if (rel.direction === "incoming" || rel.direction === "bidirectional") {
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
  for (const [nodeId, relationships] of index.reverse.entries()) {
    const updatedRels = new Set(index.forward.get(nodeId) || []);
    for (const rel of relationships) {
      updatedRels.add({
        targetId: rel.sourceId,
        type: rel.type,  // Keep this as rel.type since we're building it from existing relationship objects
        confidence: rel.confidence,
        targetType: index.nodeTypes.get(rel.sourceId) || "unknown",
      });
    }
    index.forward.set(nodeId, updatedRels);
  }

  logger.session.debug("Built relationship index", {
    nodeCount: index.nodeTypes.size,
    forwardRelationships: index.forward.size,
    reverseRelationships: index.reverse.size,
  });
  
  // Debug specific treatment relationships
  const treatmentId = 'treat_thyroid_function_tests';
  logger.session.debug("Treatment relationship debug", {
    treatmentId,
    nodeType: index.nodeTypes.get(treatmentId),
    forwardRels: index.forward.get(treatmentId) ? Array.from(index.forward.get(treatmentId)!) : [],
    reverseRels: index.reverse.get(treatmentId) ? Array.from(index.reverse.get(treatmentId)!) : []
  });

  return index;
}

/**
 * Builds node and link maps for quick lookups
 */
function buildNodeAndLinkMaps(sessionData: SessionAnalysis): { nodeMap: Map<string, any>; linkMap: Map<string, any> } {
  const nodeMap = new Map<string, any>();
  const linkMap = new Map<string, any>();

  // Build node map
  const allNodeGroups = [
    ...(sessionData.nodes.symptoms || []),
    ...(sessionData.nodes.diagnoses || []),
    ...(sessionData.nodes.treatments || []),
    ...(sessionData.nodes.actions || [])
  ];
  
  allNodeGroups.forEach(node => {
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
    console.log("sessionDataActions.loadSession called with:", { 
      sessionId: sessionData.sessionId,
      nodeGroups: Object.keys(sessionData.nodes),
      totalNodes: Object.values(sessionData.nodes).flat().length
    });
    logger.session.info("Loading session data", { sessionId: sessionData.sessionId });

    // Build all derived data
    const relationshipIndex = buildRelationshipIndex(sessionData);
    const { nodeMap, linkMap } = buildNodeAndLinkMaps(sessionData);

    const computedData: SessionComputedData = {
      sessionData,
      relationshipIndex,
      nodeMap,
      linkMap,
      isLoading: false,
      error: null
    };

    sessionDataStore.set(computedData);
    
    logger.session.info("Session data loaded with computed data", {
      sessionId: sessionData.sessionId,
      nodeCount: nodeMap.size,
      relationshipCount: relationshipIndex.forward.size
    });
  },

  /**
   * Get path calculation (pure function, no mutations)
   */
  calculatePath(nodeId: string): PathCalculation | null {
    const data = get(sessionDataStore);
    if (!data) return null;

    // Calculate path without mutating store
    const pathCalculation = calculatePathFromNode(nodeId, data);
    
    logger.session.debug("Calculated path", { 
      nodeId, 
      pathNodes: pathCalculation.path.nodes.length,
      pathLinks: pathCalculation.path.links.length 
    });

    return pathCalculation;
  },

  /**
   * Clear the session data
   */
  clearSession(): void {
    sessionDataStore.set(null);
    logger.session.info("Session data cleared");
  },

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const data = get(sessionDataStore);
    if (!data?.sessionData?.nodes?.actions) return;

    const updatedActions = data.sessionData.nodes.actions.map((action: ActionNode) => 
      action.id === alertId && action.actionType === 'alert'
        ? { ...action, status: 'acknowledged' as const }
        : action
    );

    const updatedSessionData = {
      ...data.sessionData,
      nodes: {
        ...data.sessionData.nodes,
        actions: updatedActions
      }
    };

    this.loadSession(updatedSessionData);
    logger.session.info("Alert acknowledged", { alertId });
  },

  /**
   * Answer a question
   */
  answerQuestion(questionId: string, answer: string, confidence?: number): void {
    const data = get(sessionDataStore);
    if (!data?.sessionData?.nodes?.actions) return;

    const updatedActions = data.sessionData.nodes.actions.map((action: ActionNode) => 
      action.id === questionId && action.actionType === 'question'
        ? { ...action, status: 'answered' as const, answer, confidence }
        : action
    );

    const updatedSessionData = {
      ...data.sessionData,
      nodes: {
        ...data.sessionData.nodes,
        actions: updatedActions
      }
    };

    this.loadSession(updatedSessionData);
    logger.session.info("Question answered", { questionId, answer, confidence });
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
        updatedSessionData.nodes.diagnoses = updatedSessionData.nodes.diagnoses.map(diagnosis => 
          diagnosis.id === targetId
            ? { ...diagnosis, suppressed: true, suppressionReason: reason || "User suppressed" }
            : diagnosis
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
      
      updatedSessionData.userActions = [...updatedSessionData.userActions, userAction];
    }

    this.loadSession(updatedSessionData);
    logger.session.info("Node action handled", { action, targetId, reason });
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
    sessionDataStore.update(data => data ? { ...data, isLoading: loading } : null);
    logger.session.debug("Loading state updated", { loading });
  },

  /**
   * Set error state
   */
  setError(error: string | null): void {
    sessionDataStore.update(data => data ? { ...data, error } : null);
    logger.session.error("Error state updated", { error });
  }
};

/**
 * Calculate medical reasoning path from a node using relationship index
 * Follows medical logic: Symptoms → Diagnoses → Treatments
 */
function calculatePathFromNode(nodeId: string, data: SessionComputedData): PathCalculation {
  const { relationshipIndex, nodeMap } = data;

  const pathNodes = new Set<string>();
  const pathLinks = new Set<string>();
  pathNodes.add(nodeId);

  const startingNodeType = relationshipIndex.nodeTypes.get(nodeId) || "unknown";
  
  logger.session.debug("Starting path calculation", { 
    nodeId, 
    startingNodeType,
    forwardRels: relationshipIndex.forward.get(nodeId)?.size || 0,
    reverseRels: relationshipIndex.reverse.get(nodeId)?.size || 0
  });

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
      logger.session.warn("Unknown node type for path calculation", { nodeId, startingNodeType });
      break;
  }

  const nodeItem = nodeMap.get(nodeId);
  
  logger.session.debug("Path calculation complete", {
    nodeId,
    nodeType: startingNodeType,
    totalNodes: pathNodes.size,
    totalLinks: pathLinks.size,
    nodes: Array.from(pathNodes),
    links: Array.from(pathLinks)
  });

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
  relationshipIndex: RelationshipIndex
) {
  // Find diagnoses that this treatment treats (incoming relationships)
  const reverseRels = relationshipIndex.reverse.get(treatmentId);
  
  // Debug what relationships actually exist for this treatment
  const forwardRels = relationshipIndex.forward.get(treatmentId);
  
  logger.session.debug("Treatment path calculation - ALL relationships", {
    treatmentId,
    hasReverseRels: !!reverseRels,
    reverseRelsSize: reverseRels?.size || 0,
    reverseRelsContent: reverseRels ? Array.from(reverseRels) : [],
    hasForwardRels: !!forwardRels,
    forwardRelsSize: forwardRels?.size || 0,
    forwardRelsContent: forwardRels ? Array.from(forwardRels) : []
  });
  
  // Process reverse relationships (diagnoses that require/treat this treatment)
  if (reverseRels) {
    for (const rel of reverseRels) {
      logger.session.debug("Processing treatment reverse relationship", {
        treatmentId,
        sourceId: rel.sourceId,
        sourceType: rel.sourceType,
        relationshipType: rel.type
      });
      
      if (rel.sourceType === "diagnosis") {
        pathNodes.add(rel.sourceId);
        pathLinks.add(`${rel.sourceId}-${treatmentId}`);
        
        logger.session.debug("Added diagnosis to treatment path (reverse)", {
          treatmentId,
          diagnosisId: rel.sourceId,
          relationshipType: rel.type,
          linkAdded: `${rel.sourceId}-${treatmentId}`
        });
        
        // Find symptoms that support this diagnosis
        const diagnosisReverseRels = relationshipIndex.reverse.get(rel.sourceId);
        if (diagnosisReverseRels) {
          for (const symptomRel of diagnosisReverseRels) {
            if (symptomRel.sourceType === "symptom") {
              pathNodes.add(symptomRel.sourceId);
              pathLinks.add(`${symptomRel.sourceId}-${rel.sourceId}`);
              
              logger.session.debug("Added symptom to treatment path", {
                treatmentId,
                diagnosisId: rel.sourceId,
                symptomId: symptomRel.sourceId,
                relationshipType: symptomRel.type,
                linkAdded: `${symptomRel.sourceId}-${rel.sourceId}`
              });
            }
          }
        }
      }
    }
  }
  
  // Process forward relationships (what this treatment investigates/clarifies/explores)
  if (forwardRels) {
    for (const rel of forwardRels) {
      logger.session.debug("Processing treatment forward relationship", {
        treatmentId,
        targetId: rel.targetId,
        targetType: rel.targetType,
        relationshipType: rel.type
      });
      
      if (rel.targetType === "diagnosis") {
        pathNodes.add(rel.targetId);
        // For investigates relationships, the link direction might be reversed visually
        pathLinks.add(`${rel.targetId}-${treatmentId}`);
        
        logger.session.debug("Added diagnosis to treatment path (forward)", {
          treatmentId,
          diagnosisId: rel.targetId,
          relationshipType: rel.type,
          linkAdded: `${rel.targetId}-${treatmentId}`
        });
        
        // Find symptoms that support the investigated diagnosis
        const diagnosisReverseRels = relationshipIndex.reverse.get(rel.targetId);
        if (diagnosisReverseRels) {
          for (const symptomRel of diagnosisReverseRels) {
            if (symptomRel.sourceType === "symptom") {
              pathNodes.add(symptomRel.sourceId);
              pathLinks.add(`${symptomRel.sourceId}-${rel.targetId}`);
              
              logger.session.debug("Added symptom supporting investigated diagnosis", {
                treatmentId,
                diagnosisId: rel.targetId,
                symptomId: symptomRel.sourceId,
                relationshipType: symptomRel.type,
                linkAdded: `${symptomRel.sourceId}-${rel.targetId}`
              });
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
  relationshipIndex: RelationshipIndex
) {
  // Find diagnoses that this symptom supports (outgoing relationships)
  const forwardRels = relationshipIndex.forward.get(symptomId);
  if (forwardRels) {
    for (const rel of forwardRels) {
      if (rel.targetType === "diagnosis") {
        pathNodes.add(rel.targetId);
        pathLinks.add(`${symptomId}-${rel.targetId}`);
        
        // Find treatments that this diagnosis requires
        const diagnosisForwardRels = relationshipIndex.forward.get(rel.targetId);
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
  relationshipIndex: RelationshipIndex
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
  ($store) => $store?.sessionData || null
);

export const sankeyData: Readable<any | null> = readable<any | null>(null, (set) => {
  let lastSessionRef: SessionAnalysis | null = null;

  const unsubscribe = sessionDataStore.subscribe(($store) => {
    const nextSession = $store?.sessionData || null;
    if (nextSession !== lastSessionRef) {
      lastSessionRef = nextSession;
      set(nextSession ? transformToSankeyData(nextSession) : null);
    }
  });

  return unsubscribe;
});

export const relationshipIndex: Readable<RelationshipIndex | null> = derived(
  sessionDataStore,
  ($store) => $store?.relationshipIndex || null
);

export const nodeMap: Readable<Map<string, any> | null> = derived(
  sessionDataStore,
  ($store) => $store?.nodeMap || null
);

export const linkMap: Readable<Map<string, any> | null> = derived(
  sessionDataStore,
  ($store) => $store?.linkMap || null
);

export const isLoading: Readable<boolean> = derived(
  sessionDataStore,
  ($store) => $store?.isLoading || false
);

export const error: Readable<string | null> = derived(
  sessionDataStore,
  ($store) => $store?.error || null
);

// Factory function for node-specific questions and alerts
export function questionsForNode(nodeId: string): Readable<ActionNode[]> {
  return derived(sessionData, ($sessionData) => {
    if (!$sessionData?.nodes?.actions) return [];
    
    return $sessionData.nodes.actions.filter((action: ActionNode) => 
      action.actionType === 'question' && 
      action.relationships?.some((rel: any) => rel.nodeId === nodeId)
    );
  });
}

export function alertsForNode(nodeId: string): Readable<ActionNode[]> {
  return derived(sessionData, ($sessionData) => {
    if (!$sessionData?.nodes?.actions) return [];
    
    return $sessionData.nodes.actions.filter((action: ActionNode) => 
      action.actionType === 'alert' && 
      action.relationships?.some((rel: any) => rel.nodeId === nodeId)
    );
  });
}

// Additional derived stores for actions
export const questions: Readable<ActionNode[]> = derived(sessionData, ($sessionData) => 
  $sessionData?.nodes?.actions?.filter((action: ActionNode) => action.actionType === 'question') || []
);

export const alerts: Readable<ActionNode[]> = derived(sessionData, ($sessionData) =>
  $sessionData?.nodes?.actions?.filter((action: ActionNode) => action.actionType === 'alert') || []
);

export const pendingQuestions: Readable<ActionNode[]> = derived(questions, ($questions) =>
  $questions.filter(q => q.status === 'pending')
);

export const pendingAlerts: Readable<ActionNode[]> = derived(alerts, ($alerts) =>
  $alerts.filter(a => a.status === 'pending')
);

// Factory functions for link-related actions
export function questionsForLink(link: any): Readable<ActionNode[]> {
  return derived(sessionData, ($sessionData) => {
    if (!$sessionData?.nodes?.actions || !link) return [];
    
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    return $sessionData.nodes.actions.filter((action: ActionNode) => 
      action.actionType === 'question' && 
      action.relationships?.some((rel: any) => 
        rel.nodeId === sourceId || rel.nodeId === targetId
      )
    );
  });
}

export function alertsForLink(link: any): Readable<ActionNode[]> {
  return derived(sessionData, ($sessionData) => {
    if (!$sessionData?.nodes?.actions || !link) return [];
    
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    return $sessionData.nodes.actions.filter((action: ActionNode) => 
      action.actionType === 'alert' && 
      action.relationships?.some((rel: any) => 
        rel.nodeId === sourceId || rel.nodeId === targetId
      )
    );
  });
}

// Export the main store for direct access if needed
export { sessionDataStore };