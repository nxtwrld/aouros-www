import { writable, derived, get } from "svelte/store";
import type { Writable, Readable } from "svelte/store";
import type { 
    SessionAnalysis, 
    ActionNode, 
    SymptomNode, 
    DiagnosisNode, 
    TreatmentNode,
    UserAction,
    QuestionAnswerEvent,
    NodeActionEvent,
    SankeyLink
} from "$components/session/types/visualization";
import { logger } from "$lib/logging/logger";

// Store state interface
export interface AnalysisState {
    currentSession: SessionAnalysis | null;
    isLoading: boolean;
    lastUpdated: number | null;
    userActions: UserAction[];
    error: string | null;
}

const initialState: AnalysisState = {
    currentSession: null,
    isLoading: false,
    lastUpdated: null,
    userActions: [],
    error: null,
};

// Main store
export const analysisStore: Writable<AnalysisState> = writable(initialState);

// Path-centric state management
export interface PathState {
    trigger: {
        type: 'link' | 'node';
        id: string;
        item: SankeyLink | any; // SankeyLink or SankeyNode
    } | null;
    path: {
        nodes: string[];
        links: string[];
    };
}

export interface VisualState {
    activeState: PathState | null;
    backgroundState: PathState | null; 
    shouldAnimateTrigger: boolean;
    triggerItem: PathState['trigger'] | null;
}

// Core path state stores - only one can be active at a time
export const selectedState: Writable<PathState | null> = writable(null);
export const hoveredState: Writable<PathState | null> = writable(null);

// Master visual state - handles priority and animation
export const visualState: Readable<VisualState> = derived(
    [selectedState, hoveredState],
    ([$selected, $hovered]) => ({
        // Priority: hover > selected > default
        activeState: $hovered || $selected,
        backgroundState: $hovered ? $selected : null,
        shouldAnimateTrigger: !!$selected && !$hovered,
        triggerItem: ($hovered || $selected)?.trigger || null,
    })
);

// Legacy stores for backwards compatibility - derived from new system
export const selectedNodeStore: Readable<any | null> = derived(
    selectedState,
    ($selected) => $selected?.trigger?.type === 'node' ? $selected.trigger.item : null
);

export const selectedLinkStore: Readable<SankeyLink | null> = derived(
    selectedState,
    ($selected) => $selected?.trigger?.type === 'link' ? $selected.trigger.item : null
);

// Derived stores for easy access to commonly used data
export const currentSession: Readable<SessionAnalysis | null> = derived(
    analysisStore, 
    ($store) => $store.currentSession
);

// Relationship index for efficient path calculation
export interface RelationshipIndex {
    // Forward relationships: nodeId -> Set of {targetId, relationship, type}
    forward: Map<string, Set<{targetId: string; relationship: string; targetType: string}>>;
    // Reverse relationships: nodeId -> Set of {sourceId, relationship, type}
    reverse: Map<string, Set<{sourceId: string; relationship: string; sourceType: string}>>;
    // Node type lookup for quick access
    nodeTypes: Map<string, string>;
}

/**
 * Derived store that builds a bidirectional relationship index
 * This enables O(1) lookups for both forward and reverse relationships
 */
export const relationshipIndex: Readable<RelationshipIndex | null> = derived(
    currentSession,
    ($session) => {
        if (!$session?.nodes) return null;
        
        const index: RelationshipIndex = {
            forward: new Map(),
            reverse: new Map(),
            nodeTypes: new Map()
        };
        
        // Helper to add a node to the type map
        const addNodeType = (nodeId: string, nodeType: string) => {
            index.nodeTypes.set(nodeId, nodeType);
        };
        
        // Process all node types
        const nodeGroups = [
            { nodes: $session.nodes.symptoms || [], type: 'symptom' },
            { nodes: $session.nodes.diagnoses || [], type: 'diagnosis' },
            { nodes: $session.nodes.treatments || [], type: 'treatment' },
            { nodes: $session.nodes.actions || [], type: 'action' }
        ];
        
        for (const group of nodeGroups) {
            for (const node of group.nodes) {
                addNodeType(node.id, group.type);
                
                // Process relationships if they exist
                if (node.relationships) {
                    for (const rel of node.relationships) {
                        const targetType = index.nodeTypes.get(rel.nodeId) || 'unknown';
                        
                        // Add to forward map (this node -> target)
                        if (!index.forward.has(node.id)) {
                            index.forward.set(node.id, new Set());
                        }
                        index.forward.get(node.id)!.add({
                            targetId: rel.nodeId,
                            relationship: rel.relationship,
                            targetType
                        });
                        
                        // Add to reverse map (target <- this node)
                        if (!index.reverse.has(rel.nodeId)) {
                            index.reverse.set(rel.nodeId, new Set());
                        }
                        index.reverse.get(rel.nodeId)!.add({
                            sourceId: node.id,
                            relationship: rel.relationship,
                            sourceType: group.type
                        });
                    }
                }
            }
        }
        
        // Second pass to update target types now that all nodes are indexed
        for (const [nodeId, relationships] of index.forward) {
            const updatedRels = new Set<{targetId: string; relationship: string; targetType: string}>();
            for (const rel of relationships) {
                updatedRels.add({
                    ...rel,
                    targetType: index.nodeTypes.get(rel.targetId) || 'unknown'
                });
            }
            index.forward.set(nodeId, updatedRels);
        }
        
        logger.session.debug("Built relationship index", {
            nodeCount: index.nodeTypes.size,
            forwardRelationships: index.forward.size,
            reverseRelationships: index.reverse.size
        });
        
        return index;
    }
);

export const isLoading: Readable<boolean> = derived(
    analysisStore,
    ($store) => $store.isLoading
);

export const questions: Readable<ActionNode[]> = derived(
    analysisStore,
    ($store) => $store.currentSession?.nodes?.actions?.filter(a => a.actionType === 'question') || []
);

export const alerts: Readable<ActionNode[]> = derived(
    analysisStore,
    ($store) => $store.currentSession?.nodes?.actions?.filter(a => a.actionType === 'alert') || []
);

export const pendingQuestions: Readable<ActionNode[]> = derived(
    questions,
    ($questions) => $questions.filter(q => q.status === 'pending')
);

export const answeredQuestions: Readable<ActionNode[]> = derived(
    questions,
    ($questions) => $questions.filter(q => q.status === 'answered')
);

export const pendingAlerts: Readable<ActionNode[]> = derived(
    alerts,
    ($alerts) => $alerts.filter(a => a.status === 'pending')
);

export const acknowledgedAlerts: Readable<ActionNode[]> = derived(
    alerts,
    ($alerts) => $alerts.filter(a => a.status === 'acknowledged')
);

export const symptoms: Readable<SymptomNode[]> = derived(
    analysisStore,
    ($store) => $store.currentSession?.nodes?.symptoms || []
);

export const diagnoses: Readable<DiagnosisNode[]> = derived(
    analysisStore,
    ($store) => $store.currentSession?.nodes?.diagnoses || []
);

export const treatments: Readable<TreatmentNode[]> = derived(
    analysisStore,
    ($store) => $store.currentSession?.nodes?.treatments || []
);

export const actions: Readable<ActionNode[]> = derived(
    analysisStore,
    ($store) => $store.currentSession?.nodes?.actions || []
);

// Smart derived stores for filtering - these automatically update when selections change

/**
 * Get related actions for the currently selected link
 * Replaces manager.getRelatedActions() with reactive store
 */
export const relatedActionsForSelectedLink = derived(
    [currentSession, selectedLinkStore],
    ([$session, $selectedLink]) => {
        if (!$session?.nodes?.actions || !$selectedLink) {
            console.log('relatedActionsForSelectedLink: No session or link', { 
                hasSession: !!$session, 
                hasActions: !!$session?.nodes?.actions,
                hasLink: !!$selectedLink 
            });
            return [];
        }

        const sourceNode = $selectedLink.source;
        const targetNode = $selectedLink.target;
        const sourceId = typeof sourceNode === 'object' ? sourceNode.id : sourceNode;
        const targetId = typeof targetNode === 'object' ? targetNode.id : targetNode;
        
        console.log('relatedActionsForSelectedLink: Processing link', { 
            sourceId, 
            targetId, 
            linkType: $selectedLink.type 
        });
        
        const actions = $session.nodes.actions;
        
        // For now, let's show all actions that relate to either the source or target node
        // We'll refine this logic based on the actual link types we see
        const relatedActions = actions.filter(action => {
            if (!action.relationships) return false;
            
            // Include actions that relate to either the source or target node
            const isRelated = action.relationships.some(rel => 
                rel.nodeId === sourceId || rel.nodeId === targetId
            );
            
            if (isRelated) {
                console.log('Found related action:', { 
                    actionId: action.id, 
                    actionType: action.actionType, 
                    text: action.text?.substring(0, 50) 
                });
            }
            
            return isRelated;
        });
        
        console.log('relatedActionsForSelectedLink: Found actions', relatedActions.length);
        
        // Sort by priority (1 = highest priority)
        return relatedActions.sort((a, b) => (a.priority || 10) - (b.priority || 10));
    }
);

/**
 * Get actions related to the currently selected node
 */
export const actionsForSelectedNode = derived(
    [currentSession, selectedNodeStore],
    ([$session, $selectedNode]) => {
        if (!$session?.nodes?.actions || !$selectedNode) return [];

        return $session.nodes.actions.filter(action => {
            if (!action.relationships) return false;
            return action.relationships.some(rel => rel.nodeId === $selectedNode.id);
        }).sort((a, b) => (a.priority || 10) - (b.priority || 10));
    }
);

/**
 * High priority questions (priority <= 2)
 */
export const highPriorityQuestions = derived(
    questions,
    ($questions) => $questions
        .filter(q => (q.priority || 10) <= 2)
        .sort((a, b) => (a.priority || 10) - (b.priority || 10))
);

/**
 * High priority alerts (priority <= 2)
 */
export const highPriorityAlerts = derived(
    alerts,
    ($alerts) => $alerts
        .filter(a => (a.priority || 10) <= 2)
        .sort((a, b) => (a.priority || 10) - (b.priority || 10))
);

/**
 * All high priority actions combined
 */
export const highPriorityActions = derived(
    [highPriorityQuestions, highPriorityAlerts],
    ([$questions, $alerts]) => [
        ...$questions,
        ...$alerts
    ].sort((a, b) => (a.priority || 10) - (b.priority || 10))
);

/**
 * Questions filtered for selected link (from related actions)
 */
export const questionsForSelectedLink = derived(
    relatedActionsForSelectedLink,
    ($relatedActions) => $relatedActions.filter(a => a.actionType === 'question')
);

/**
 * Alerts filtered for selected link (from related actions)
 */
export const alertsForSelectedLink = derived(
    relatedActionsForSelectedLink,
    ($relatedActions) => $relatedActions.filter(a => a.actionType === 'alert')
);

/**
 * Suppressed diagnoses
 */
export const suppressedDiagnoses = derived(
    diagnoses,
    ($diagnoses) => $diagnoses.filter(d => d.suppressed)
);

/**
 * Active (non-suppressed) diagnoses
 */
export const activeDiagnoses = derived(
    diagnoses,
    ($diagnoses) => $diagnoses.filter(d => !d.suppressed)
);

/**
 * Recommended next actions (high priority pending items)
 */
export const recommendedActions = derived(
    actions,
    ($actions) => $actions
        .filter(action => 
            action.status === 'pending' && 
            (action.priority || 10) <= 3
        )
        .sort((a, b) => (a.priority || 10) - (b.priority || 10))
        .slice(0, 5) // Top 5 recommendations
);

// Helper derived store for statistics
export const analysisStats = derived(
    [analysisStore, highPriorityActions, suppressedDiagnoses],
    ([$store, $highPriorityActions, $suppressedDiagnoses]) => {
        if (!$store.currentSession) {
            return {
                totalSymptoms: 0,
                totalDiagnoses: 0,
                totalTreatments: 0,
                totalQuestions: 0,
                totalAlerts: 0,
                pendingQuestions: 0,
                pendingAlerts: 0,
                highPriorityActions: 0,
                suppressedDiagnoses: 0
            };
        }

        const nodes = $store.currentSession.nodes;
        const allActions = nodes.actions || [];
        const questionActions = allActions.filter(a => a.actionType === 'question');
        const alertActions = allActions.filter(a => a.actionType === 'alert');

        return {
            totalSymptoms: nodes.symptoms?.length || 0,
            totalDiagnoses: nodes.diagnoses?.length || 0,
            totalTreatments: nodes.treatments?.length || 0,
            totalQuestions: questionActions.length,
            totalAlerts: alertActions.length,
            pendingQuestions: questionActions.filter(q => q.status === 'pending').length,
            pendingAlerts: alertActions.filter(a => a.status === 'pending').length,
            highPriorityActions: $highPriorityActions.length,
            suppressedDiagnoses: $suppressedDiagnoses.length
        };
    }
);

// Path calculation functions
export function calculatePathFromLink(link: SankeyLink, sessionData: SessionAnalysis | null): PathState {
    const linkId = typeof link.source === 'object' ? 
        `${link.source.id}-${link.target.id}` : 
        `${link.source}-${link.target}`;
        
    if (!sessionData?.nodes) {
        return {
            trigger: { type: 'link', id: linkId, item: link },
            path: { nodes: [], links: [] }
        };
    }

    const sourceId = typeof link.source === 'object' ? link.source.id : String(link.source);
    const targetId = typeof link.target === 'object' ? link.target.id : String(link.target);
    
    // Get the relationship index for efficient lookups
    const index = get(relationshipIndex);
    if (!index) {
        console.log('No relationship index available for link path calculation');
        return {
            trigger: { type: 'link', id: linkId, item: link },
            path: { nodes: [sourceId, targetId], links: [linkId] }
        };
    }
    
    const pathNodes = new Set<string>();
    const pathLinks = new Set<string>();
    
    // Add the clicked link's nodes and the link itself
    pathNodes.add(sourceId);
    pathNodes.add(targetId);
    pathLinks.add(linkId);
    
    // Get node types from the index
    const sourceType = index.nodeTypes.get(sourceId);
    const targetType = index.nodeTypes.get(targetId);
    
    console.log(`Building focused path from link: ${sourceType} -> ${targetType}`);
    
    // For link hover, we want to show only the medical reasoning path that includes this specific link
    // Not all paths from the source node, but the path that this link is part of
    
    if (sourceType === 'symptom' && targetType === 'diagnosis') {
        // This is a Symptom -> Diagnosis link
        // Show: this symptom -> this diagnosis -> treatments for this diagnosis
        
        // Find treatments that this specific diagnosis requires
        const treatmentRels = index.forward.get(targetId) || new Set();
        for (const rel of treatmentRels) {
            if (rel.targetType === 'treatment' && rel.relationship === 'requires') {
                pathNodes.add(rel.targetId);
                pathLinks.add(`${targetId}-${rel.targetId}`);
                console.log(`Added treatment ${rel.targetId} for diagnosis ${targetId}`);
            }
        }
    } else if (sourceType === 'diagnosis' && targetType === 'treatment') {
        // This is a Diagnosis -> Treatment link  
        // Show: symptoms supporting this diagnosis -> this diagnosis -> this treatment
        
        // Find symptoms that support this specific diagnosis
        const symptomRels = index.reverse.get(sourceId) || new Set();
        for (const rel of symptomRels) {
            if (rel.sourceType === 'symptom' && 
                (rel.relationship === 'supports' || rel.relationship === 'suggests' || rel.relationship === 'indicates')) {
                pathNodes.add(rel.sourceId);
                pathLinks.add(`${rel.sourceId}-${sourceId}`);
                console.log(`Added symptom ${rel.sourceId} supporting diagnosis ${sourceId}`);
            }
        }
    } else if (sourceType === 'symptom' && targetType === 'treatment') {
        // Direct symptom to treatment (less common, but possible)
        // Show just the direct relationship
        console.log('Direct symptom to treatment relationship');
    } else if (sourceType === 'treatment' && targetType === 'diagnosis') {
        // Reverse treatment -> diagnosis relationship
        // Show: symptoms supporting this diagnosis -> this diagnosis -> this treatment
        
        // Find symptoms that support this diagnosis
        const symptomRels = index.reverse.get(targetId) || new Set();
        for (const rel of symptomRels) {
            if (rel.sourceType === 'symptom' && 
                (rel.relationship === 'supports' || rel.relationship === 'suggests' || rel.relationship === 'indicates')) {
                pathNodes.add(rel.sourceId);
                pathLinks.add(`${rel.sourceId}-${targetId}`);
                console.log(`Added symptom ${rel.sourceId} supporting diagnosis ${targetId}`);
            }
        }
    } else if (sourceType === 'diagnosis' && targetType === 'symptom') {
        // Reverse diagnosis -> symptom relationship 
        // Show: this symptom -> this diagnosis -> treatments for this diagnosis
        
        // Find treatments for this diagnosis
        const treatmentRels = index.forward.get(sourceId) || new Set();
        for (const rel of treatmentRels) {
            if (rel.targetType === 'treatment' && rel.relationship === 'requires') {
                pathNodes.add(rel.targetId);
                pathLinks.add(`${sourceId}-${rel.targetId}`);
                console.log(`Added treatment ${rel.targetId} for diagnosis ${sourceId}`);
            }
        }
    } else if (sourceType === 'treatment' && targetType === 'symptom') {
        // Treatment -> Symptom (treating symptom directly)
        // This might be rare, just show the direct relationship
        console.log('Direct treatment to symptom relationship');
    } else {
        console.log(`Unhandled link type: ${sourceType} -> ${targetType}`);
    }
    
    logger.session.debug("Calculated path from link", { 
        linkId, 
        sourceType, 
        targetType, 
        pathNodes: Array.from(pathNodes), 
        pathLinks: Array.from(pathLinks),
        nodeCount: pathNodes.size,
        linkCount: pathLinks.size
    });
    
    return {
        trigger: { type: 'link', id: linkId, item: link },
        path: {
            nodes: Array.from(pathNodes),
            links: Array.from(pathLinks)
        }
    };
}

export function calculatePathFromNode(nodeId: string, sessionData: SessionAnalysis | null): PathState {
    console.log('calculatePathFromNode starting:', { nodeId });
    
    if (!sessionData?.nodes) {
        console.log('No session data available');
        return {
            trigger: { type: 'node', id: nodeId, item: null },
            path: { nodes: [nodeId], links: [] }
        };
    }

    // Get the relationship index for efficient lookups
    const index = get(relationshipIndex);
    if (!index) {
        console.log('No relationship index available');
        return {
            trigger: { type: 'node', id: nodeId, item: null },
            path: { nodes: [nodeId], links: [] }
        };
    }

    const pathNodes = new Set<string>();
    const pathLinks = new Set<string>();
    pathNodes.add(nodeId);
    
    // Get the starting node type from the index
    const startingNodeType = index.nodeTypes.get(nodeId);
    if (!startingNodeType) {
        console.log('Node type not found in index');
        return {
            trigger: { type: 'node', id: nodeId, item: null },
            path: { nodes: [nodeId], links: [] }
        };
    }
    
    // Build medical reasoning path based on the starting node type
    if (startingNodeType === 'treatment') {
        // For treatments: Treatment <- Diagnosis <- Symptoms (backward reasoning)
        console.log('Building backward medical reasoning path from treatment');
        
        // Find diagnoses connected to this treatment
        const forwardRels = index.forward.get(nodeId) || new Set();
        for (const rel of forwardRels) {
            if (rel.targetType === 'diagnosis' && 
                (rel.relationship === 'treats' || rel.relationship === 'investigates')) {
                pathNodes.add(rel.targetId);
                pathLinks.add(`${rel.targetId}-${nodeId}`);
                console.log(`Added diagnosis ${rel.targetId} for treatment`);
            }
        }
        
        // Find diagnoses that require this treatment (reverse lookup)
        const reverseRels = index.reverse.get(nodeId) || new Set();
        for (const rel of reverseRels) {
            if (rel.sourceType === 'diagnosis' && rel.relationship === 'requires') {
                pathNodes.add(rel.sourceId);
                pathLinks.add(`${rel.sourceId}-${nodeId}`);
                console.log(`Added diagnosis ${rel.sourceId} that requires treatment`);
            }
        }
        
        // For each diagnosis found, find symptoms using reverse lookup
        const diagnosesToProcess = Array.from(pathNodes).filter(id => index.nodeTypes.get(id) === 'diagnosis');
        for (const diagnosisId of diagnosesToProcess) {
            const symptomRels = index.reverse.get(diagnosisId) || new Set();
            for (const rel of symptomRels) {
                if (rel.sourceType === 'symptom' && 
                    (rel.relationship === 'supports' || rel.relationship === 'suggests' || rel.relationship === 'indicates')) {
                    pathNodes.add(rel.sourceId);
                    pathLinks.add(`${rel.sourceId}-${diagnosisId}`);
                    console.log(`Added symptom ${rel.sourceId} for diagnosis ${diagnosisId}`);
                }
            }
        }
    } else if (startingNodeType === 'diagnosis') {
        // For diagnoses: find both symptoms (backward) and treatments (forward)
        console.log('Building medical reasoning path from diagnosis');
        
        // Find symptoms that support this diagnosis (using reverse lookup)
        const symptomRels = index.reverse.get(nodeId) || new Set();
        for (const rel of symptomRels) {
            if (rel.sourceType === 'symptom' && 
                (rel.relationship === 'supports' || rel.relationship === 'suggests' || rel.relationship === 'indicates')) {
                pathNodes.add(rel.sourceId);
                pathLinks.add(`${rel.sourceId}-${nodeId}`);
                console.log(`Added symptom ${rel.sourceId} that ${rel.relationship} diagnosis`);
            }
        }
        
        // Find treatments for this diagnosis (using forward lookup)
        const treatmentRels = index.forward.get(nodeId) || new Set();
        for (const rel of treatmentRels) {
            if (rel.targetType === 'treatment' && rel.relationship === 'requires') {
                pathNodes.add(rel.targetId);
                pathLinks.add(`${nodeId}-${rel.targetId}`);
                console.log(`Added treatment ${rel.targetId} required by diagnosis`);
            }
        }
        
        // Also check reverse for treatments that treat this diagnosis
        const treatmentReverse = index.reverse.get(nodeId) || new Set();
        for (const rel of treatmentReverse) {
            if (rel.sourceType === 'treatment' && rel.relationship === 'treats') {
                pathNodes.add(rel.sourceId);
                pathLinks.add(`${rel.sourceId}-${nodeId}`);
                console.log(`Added treatment ${rel.sourceId} that treats diagnosis`);
            }
        }
    } else if (startingNodeType === 'symptom') {
        // For symptoms: Symptom -> Diagnosis -> Treatment (forward reasoning)
        console.log('Building forward medical reasoning path from symptom');
        
        // Find diagnoses this symptom supports (using forward lookup)
        const diagnosisRels = index.forward.get(nodeId) || new Set();
        for (const rel of diagnosisRels) {
            if (rel.targetType === 'diagnosis' &&
                (rel.relationship === 'supports' || rel.relationship === 'suggests' || rel.relationship === 'indicates')) {
                
                const diagnosisId = rel.targetId;
                pathNodes.add(diagnosisId);
                pathLinks.add(`${nodeId}-${diagnosisId}`); // Symptom -> Diagnosis
                console.log(`Added diagnosis ${diagnosisId} supported by symptom`);
                
                // Find treatments for this diagnosis
                const treatmentRels = index.forward.get(diagnosisId) || new Set();
                for (const treatRel of treatmentRels) {
                    if (treatRel.targetType === 'treatment' && treatRel.relationship === 'requires') {
                        pathNodes.add(treatRel.targetId);
                        pathLinks.add(`${diagnosisId}-${treatRel.targetId}`); // Diagnosis -> Treatment
                        console.log(`Added treatment ${treatRel.targetId} for diagnosis ${diagnosisId}`);
                    }
                }
                
                // Also check reverse for treatments that treat this diagnosis
                const treatmentReverse = index.reverse.get(diagnosisId) || new Set();
                for (const treatRel of treatmentReverse) {
                    if (treatRel.sourceType === 'treatment' && treatRel.relationship === 'treats') {
                        pathNodes.add(treatRel.sourceId);
                        pathLinks.add(`${treatRel.sourceId}-${diagnosisId}`);
                        console.log(`Added treatment ${treatRel.sourceId} that treats diagnosis ${diagnosisId}`);
                    }
                }
            }
        }
    }
    
    console.log(`Completed path calculation for ${startingNodeType}: ${pathNodes.size} nodes, ${pathLinks.size} links`);
    
    const nodeItem = sessionData.nodes?.symptoms?.find(n => n.id === nodeId) ||
                    sessionData.nodes?.diagnoses?.find(n => n.id === nodeId) ||
                    sessionData.nodes?.treatments?.find(n => n.id === nodeId) ||
                    sessionData.nodes?.actions?.find(n => n.id === nodeId);
    
    logger.session.debug("Calculated path from node", { 
        nodeId, 
        nodeType: startingNodeType,
        pathNodes: Array.from(pathNodes), 
        pathLinks: Array.from(pathLinks),
        nodeCount: pathNodes.size,
        linkCount: pathLinks.size
    });
    
    return {
        trigger: { type: 'node', id: nodeId, item: nodeItem },
        path: {
            nodes: Array.from(pathNodes),
            links: Array.from(pathLinks)
        }
    };
}

// Store actions
export const analysisActions = {
    // Load initial session data
    loadSession: (sessionData: SessionAnalysis) => {
        logger.session.info("Loading session analysis data", { 
            sessionId: sessionData.sessionId,
            analysisVersion: sessionData.analysisVersion 
        });

        analysisStore.update(state => ({
            ...state,
            currentSession: sessionData,
            lastUpdated: Date.now(),
            error: null,
            isLoading: false
        }));
    },

    // Update entire session (for real-time updates)
    updateSession: (sessionData: SessionAnalysis) => {
        logger.session.debug("Updating session analysis data", { 
            sessionId: sessionData.sessionId,
            analysisVersion: sessionData.analysisVersion 
        });

        analysisStore.update(state => ({
            ...state,
            currentSession: sessionData,
            lastUpdated: Date.now(),
            error: null
        }));
    },

    // Partial update of session data
    updatePartial: (updates: Partial<SessionAnalysis>) => {
        analysisStore.update(state => {
            if (!state.currentSession) return state;

            const updatedSession = { ...state.currentSession, ...updates };
            
            logger.session.debug("Partial session update", { 
                sessionId: state.currentSession.sessionId,
                updates: Object.keys(updates)
            });

            return {
                ...state,
                currentSession: updatedSession,
                lastUpdated: Date.now(),
                error: null
            };
        });
    },

    // Answer a question
    answerQuestion: (questionId: string, answer: string, confidence?: number) => {
        const userAction: UserAction = {
            timestamp: new Date().toISOString(),
            action: 'question',
            targetId: questionId,
            confidence,
            note: answer
        };

        analysisStore.update(state => {
            if (!state.currentSession?.nodes?.actions) return state;

            const updatedActions = state.currentSession.nodes.actions.map(action => {
                if (action.id === questionId && action.actionType === 'question') {
                    return {
                        ...action,
                        status: 'answered' as const,
                        answer: answer
                    };
                }
                return action;
            });

            logger.session.info("Question answered", { 
                questionId, 
                answer: answer.substring(0, 50) + (answer.length > 50 ? '...' : '')
            });

            return {
                ...state,
                currentSession: {
                    ...state.currentSession,
                    nodes: {
                        ...state.currentSession.nodes,
                        actions: updatedActions
                    }
                },
                userActions: [...state.userActions, userAction],
                lastUpdated: Date.now()
            };
        });
    },

    // Acknowledge an alert
    acknowledgeAlert: (alertId: string) => {
        const userAction: UserAction = {
            timestamp: new Date().toISOString(),
            action: 'accept',
            targetId: alertId
        };

        analysisStore.update(state => {
            if (!state.currentSession?.nodes?.actions) return state;

            const updatedActions = state.currentSession.nodes.actions.map(action => {
                if (action.id === alertId && action.actionType === 'alert') {
                    return {
                        ...action,
                        status: 'acknowledged' as const
                    };
                }
                return action;
            });

            logger.session.info("Alert acknowledged", { alertId });

            return {
                ...state,
                currentSession: {
                    ...state.currentSession,
                    nodes: {
                        ...state.currentSession.nodes,
                        actions: updatedActions
                    }
                },
                userActions: [...state.userActions, userAction],
                lastUpdated: Date.now()
            };
        });
    },

    // Handle node actions (suppress, accept, highlight)
    handleNodeAction: (action: string, targetId: string, reason?: string) => {
        const userAction: UserAction = {
            timestamp: new Date().toISOString(),
            action: action as UserAction['action'],
            targetId: targetId,
            reason: reason
        };

        analysisStore.update(state => {
            if (!state.currentSession) return state;

            let updatedSession = { ...state.currentSession };

            // Find and update the target node based on action
            if (action === 'suppress') {
                // Update diagnoses
                if (updatedSession.nodes.diagnoses) {
                    updatedSession.nodes.diagnoses = updatedSession.nodes.diagnoses.map(diagnosis => 
                        diagnosis.id === targetId ? { 
                            ...diagnosis, 
                            suppressed: true,
                            suppressionReason: reason || 'User suppressed'
                        } : diagnosis
                    );
                }
                // Could also handle other node types (symptoms, treatments) here
            }

            logger.session.info("Node action processed", { action, targetId, reason });

            return {
                ...state,
                currentSession: updatedSession,
                userActions: [...state.userActions, userAction],
                lastUpdated: Date.now()
            };
        });
    },

    // Set loading state
    setLoading: (loading: boolean) => {
        analysisStore.update(state => ({
            ...state,
            isLoading: loading
        }));
    },

    // Set error state
    setError: (error: string | null) => {
        analysisStore.update(state => ({
            ...state,
            error,
            isLoading: false
        }));
    },

    // Clear session
    clearSession: () => {
        logger.session.info("Clearing session analysis data");
        analysisStore.set(initialState);
    },

    // Get current state snapshot
    getState: (): AnalysisState => {
        return get(analysisStore);
    },

    // Get current session snapshot
    getCurrentSession: (): SessionAnalysis | null => {
        return get(analysisStore).currentSession;
    },

    // Unified path management
    selectItem: (type: 'link' | 'node', item: SankeyLink | any) => {
        const currentSession = get(analysisStore).currentSession;
        
        if (type === 'link') {
            const pathState = calculatePathFromLink(item as SankeyLink, currentSession);
            logger.session.debug("Link selected", { 
                linkId: pathState.trigger?.id,
                pathNodes: pathState.path.nodes.length,
                pathLinks: pathState.path.links.length
            });
            selectedState.set(pathState);
        } else {
            const pathState = calculatePathFromNode(item.id, currentSession);
            logger.session.debug("Node selected", { 
                nodeId: pathState.trigger?.id,
                pathNodes: pathState.path.nodes.length,
                pathLinks: pathState.path.links.length
            });
            selectedState.set(pathState);
        }
    },

    hoverItem: (type: 'link' | 'node', item: SankeyLink | any | null) => {
        console.log('hoverItem called:', { type, item });
        
        if (!item) {
            hoveredState.set(null);
            return;
        }

        const currentSession = get(analysisStore).currentSession;
        console.log('Current session for hover:', { hasSession: !!currentSession, sessionId: currentSession?.sessionId });
        
        if (type === 'link') {
            const pathState = calculatePathFromLink(item as SankeyLink, currentSession);
            hoveredState.set(pathState);
        } else {
            console.log('Calling calculatePathFromNode for node:', item.id);
            const pathState = calculatePathFromNode(item.id, currentSession);
            console.log('Path calculation result:', {
                trigger: pathState.trigger,
                pathNodes: pathState.path.nodes,
                pathLinks: pathState.path.links,
                nodeCount: pathState.path.nodes.length,
                linkCount: pathState.path.links.length
            });
            hoveredState.set(pathState);
        }
    },

    clearSelection: () => {
        logger.session.debug("Clearing selection");
        selectedState.set(null);
    },

    clearHover: () => {
        hoveredState.set(null);
    },

    // Legacy methods for backwards compatibility
    selectNode: (node: any | null) => {
        if (node) {
            analysisActions.selectItem('node', node);
        } else {
            analysisActions.clearSelection();
        }
    },

    selectLink: (link: SankeyLink | null) => {
        if (link) {
            analysisActions.selectItem('link', link);
        } else {
            analysisActions.clearSelection();
        }
    }
};

// Helper function to create question answer events
export function createQuestionAnswerEvent(
    questionId: string,
    answer: string,
    confidence?: number
): QuestionAnswerEvent {
    return {
        questionId,
        answer,
        confidence
    };
}

// Helper function to create node action events
export function createNodeActionEvent(
    action: 'accept' | 'suppress' | 'highlight',
    targetId: string,
    reason?: string
): NodeActionEvent {
    return {
        action,
        targetId,
        reason
    };
}

// Export the store as default for backwards compatibility
export default analysisStore;