import { writable, derived, get } from "svelte/store";
import type { Writable, Readable } from "svelte/store";
import { logger } from "$lib/logging/logger";
import {
  sessionData,
  relationshipIndex,
  nodeMap,
  sessionDataActions,
} from "./session-data-store";
import type { SessionAnalysis } from "$components/session/types/visualization";

// Path calculation types
interface PathCalculation {
  trigger: { type: "node" | "link"; id: string; item: any };
  path: { nodes: string[]; links: string[] };
}

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

// Types for UI state
interface SelectedItem {
  type: "node" | "link";
  id: string;
  item: any;
}

interface ViewerState {
  // Selection state
  selectedItem: SelectedItem | null;
  hoveredItem: SelectedItem | null;

  // Visual state
  highlightedNodes: Set<string>;
  highlightedLinks: Set<string>;

  // Path visualization
  activePath: {
    nodes: string[];
    links: string[];
  } | null;

  // Zoom and pan
  zoomLevel: number;
  panOffset: { x: number; y: number };

  // UI controls
  sidebarOpen: boolean;
  showLegend: boolean;
  filterOptions: {
    showSymptoms: boolean;
    showDiagnoses: boolean;
    showTreatments: boolean;
    showActions: boolean;
  };

  // Interaction state
  isDragging: boolean;
  isZooming: boolean;

  // Alert acknowledgments (UI state, not data)
  acknowledgedAlerts: Set<string>;

  // Question responses (UI state, not data)
  answeredQuestions: Map<string, { answer: any; confidence: number }>;
}

// Initial state
const initialViewerState: ViewerState = {
  selectedItem: null,
  hoveredItem: null,
  highlightedNodes: new Set(),
  highlightedLinks: new Set(),
  activePath: null,
  zoomLevel: 1,
  panOffset: { x: 0, y: 0 },
  sidebarOpen: true,
  showLegend: true,
  filterOptions: {
    showSymptoms: true,
    showDiagnoses: true,
    showTreatments: true,
    showActions: true,
  },
  isDragging: false,
  isZooming: false,
  acknowledgedAlerts: new Set(),
  answeredQuestions: new Map(),
};

// Store 2: Session Viewer State Store (UI state only)
const sessionViewerStore: Writable<ViewerState> = writable(initialViewerState);

/**
 * Actions for managing viewer state
 */
export const sessionViewerActions = {
  /**
   * Selection management
   */
  selectItem(type: "node" | "link", id: string, item: any): void {
    sessionViewerStore.update((state) => ({
      ...state,
      selectedItem: { type, id, item },
    }));

    // Automatically calculate path when a node is selected
    if (type === "node") {
      this.calculateAndSetActivePath(id);
    }

    logger.session.debug("Item selected", { type, id });
  },

  clearSelection(): void {
    sessionViewerStore.update((state) => ({
      ...state,
      selectedItem: null,
      activePath: null,
    }));

    // Clear the active path when selection is cleared
    this.clearActivePath();

    logger.session.debug("Selection cleared");
  },

  setHoveredItem(type: "node" | "link" | null, id?: string, item?: any): void {
    sessionViewerStore.update((state) => ({
      ...state,
      hoveredItem: type ? { type, id: id!, item } : null,
    }));
  },

  /**
   * Path visualization
   */
  setActivePath(nodes: string[], links: string[]): void {
    sessionViewerStore.update((state) => ({
      ...state,
      activePath: { nodes, links },
      highlightedNodes: new Set(nodes),
      highlightedLinks: new Set(links),
    }));

    logger.session.debug("Active path set", {
      nodeCount: nodes.length,
      linkCount: links.length,
    });
  },

  clearActivePath(): void {
    sessionViewerStore.update((state) => ({
      ...state,
      activePath: null,
      highlightedNodes: new Set(),
      highlightedLinks: new Set(),
    }));

    logger.session.debug("Active path cleared");
  },

  /**
   * Calculate path for a node and set it as active path
   * Uses the same calculation method as hover paths for consistency
   */
  calculateAndSetActivePath(
    nodeId: string,
    sessionDataSnapshot?: any,
    relationshipIndexSnapshot?: any,
    nodeMapSnapshot?: any,
  ): void {
    // Use the same path calculation method from sessionDataActions for consistency
    const pathCalculation = sessionDataActions.calculatePath(nodeId);

    if (pathCalculation) {
      this.setActivePath(
        pathCalculation.path.nodes,
        pathCalculation.path.links,
      );
      logger.session.debug(
        "Calculated and set active path using shared method",
        {
          nodeId,
          pathNodes: pathCalculation.path.nodes.length,
          pathLinks: pathCalculation.path.links.length,
        },
      );
    } else {
      this.clearActivePath();
      logger.session.debug("No path calculated, cleared active path", {
        nodeId,
      });
    }
  },

  /**
   * Highlight management
   */
  highlightNodes(nodeIds: string[]): void {
    sessionViewerStore.update((state) => ({
      ...state,
      highlightedNodes: new Set(nodeIds),
    }));
  },

  highlightLinks(linkIds: string[]): void {
    sessionViewerStore.update((state) => ({
      ...state,
      highlightedLinks: new Set(linkIds),
    }));
  },

  clearHighlights(): void {
    sessionViewerStore.update((state) => ({
      ...state,
      highlightedNodes: new Set(),
      highlightedLinks: new Set(),
    }));
  },

  /**
   * Zoom and pan
   */
  setZoom(level: number): void {
    sessionViewerStore.update((state) => ({
      ...state,
      zoomLevel: Math.max(0.1, Math.min(5, level)),
    }));
  },

  setPan(x: number, y: number): void {
    sessionViewerStore.update((state) => ({
      ...state,
      panOffset: { x, y },
    }));
  },

  resetView(): void {
    sessionViewerStore.update((state) => ({
      ...state,
      zoomLevel: 1,
      panOffset: { x: 0, y: 0 },
    }));

    logger.session.debug("View reset to default");
  },

  /**
   * UI controls
   */
  toggleSidebar(): void {
    sessionViewerStore.update((state) => ({
      ...state,
      sidebarOpen: !state.sidebarOpen,
    }));
  },

  toggleLegend(): void {
    sessionViewerStore.update((state) => ({
      ...state,
      showLegend: !state.showLegend,
    }));
  },

  setFilter(
    filterType: keyof ViewerState["filterOptions"],
    enabled: boolean,
  ): void {
    sessionViewerStore.update((state) => ({
      ...state,
      filterOptions: {
        ...state.filterOptions,
        [filterType]: enabled,
      },
    }));
  },

  /**
   * Interaction state
   */
  setDragging(isDragging: boolean): void {
    sessionViewerStore.update((state) => ({
      ...state,
      isDragging,
    }));
  },

  setZooming(isZooming: boolean): void {
    sessionViewerStore.update((state) => ({
      ...state,
      isZooming,
    }));
  },

  /**
   * Alert and question state (UI only)
   */
  acknowledgeAlert(alertId: string): void {
    sessionViewerStore.update((state) => {
      const newAcknowledged = new Set(state.acknowledgedAlerts);
      newAcknowledged.add(alertId);
      return {
        ...state,
        acknowledgedAlerts: newAcknowledged,
      };
    });

    logger.session.debug("Alert acknowledged", { alertId });
  },

  answerQuestion(questionId: string, answer: any, confidence: number): void {
    sessionViewerStore.update((state) => {
      const newAnswers = new Map(state.answeredQuestions);
      newAnswers.set(questionId, { answer, confidence });
      return {
        ...state,
        answeredQuestions: newAnswers,
      };
    });

    logger.session.debug("Question answered", { questionId, confidence });
  },

  /**
   * Reset all viewer state
   */
  resetViewerState(): void {
    sessionViewerStore.set(initialViewerState);
    logger.session.info("Viewer state reset");
  },
};

/**
 * Build relationship index non-reactively from session data
 */
function buildRelationshipIndexNonReactive(
  sessionData: any,
): RelationshipIndex {
  // Import the buildRelationshipIndex function from session-data-store
  // For now, we'll duplicate the logic to avoid circular imports
  const index: RelationshipIndex = {
    forward: new Map(),
    reverse: new Map(),
    nodeTypes: new Map(),
  };

  // Process all node types (simplified version)
  const nodeGroups = [
    { nodes: sessionData.nodes?.symptoms || [], type: "symptom" },
    { nodes: sessionData.nodes?.diagnoses || [], type: "diagnosis" },
    { nodes: sessionData.nodes?.treatments || [], type: "treatment" },
    { nodes: sessionData.nodes?.actions || [], type: "action" },
  ];

  for (const group of nodeGroups) {
    for (const node of group.nodes) {
      index.nodeTypes.set(node.id, group.type);

      if (node.relationships) {
        for (const rel of node.relationships) {
          const targetType = index.nodeTypes.get(rel.nodeId) || "unknown";

          if (
            rel.direction === "outgoing" ||
            rel.direction === "bidirectional"
          ) {
            if (!index.forward.has(node.id)) {
              index.forward.set(node.id, new Set());
            }
            index.forward.get(node.id)!.add({
              targetId: rel.nodeId,
              type: rel.relationship,
              confidence: rel.confidence || 1.0,
              targetType,
            });

            if (!index.reverse.has(rel.nodeId)) {
              index.reverse.set(rel.nodeId, new Set());
            }
            index.reverse.get(rel.nodeId)!.add({
              sourceId: node.id,
              type: rel.relationship,
              confidence: rel.confidence || 1.0,
              sourceType: group.type,
            });
          }

          if (
            rel.direction === "incoming" ||
            rel.direction === "bidirectional"
          ) {
            if (!index.forward.has(rel.nodeId)) {
              index.forward.set(rel.nodeId, new Set());
            }
            index.forward.get(rel.nodeId)!.add({
              targetId: node.id,
              type: rel.relationship,
              confidence: rel.confidence || 1.0,
              targetType: group.type,
            });

            if (!index.reverse.has(node.id)) {
              index.reverse.set(node.id, new Set());
            }
            index.reverse.get(node.id)!.add({
              sourceId: rel.nodeId,
              type: rel.relationship,
              confidence: rel.confidence || 1.0,
              sourceType: targetType,
            });
          }
        }
      }
    }
  }

  return index;
}

/**
 * Build node map non-reactively from session data
 */
function buildNodeMapNonReactive(sessionData: any): Map<string, any> {
  const nodeMap = new Map<string, any>();

  const allNodeGroups = [
    ...(sessionData.nodes?.symptoms || []),
    ...(sessionData.nodes?.diagnoses || []),
    ...(sessionData.nodes?.treatments || []),
    ...(sessionData.nodes?.actions || []),
  ];

  allNodeGroups.forEach((node) => {
    nodeMap.set(node.id, node);
  });

  return nodeMap;
}

// Path calculation functions removed - now using shared sessionDataActions.calculatePath method

// Derived stores for common UI queries
export const selectedItem: Readable<SelectedItem | null> = derived(
  sessionViewerStore,
  ($store) => $store.selectedItem,
);

export const hoveredItem: Readable<SelectedItem | null> = derived(
  sessionViewerStore,
  ($store) => $store.hoveredItem,
);

export const activePath: Readable<{ nodes: string[]; links: string[] } | null> =
  derived(sessionViewerStore, ($store) => $store.activePath);

export const highlightedNodes: Readable<Set<string>> = derived(
  sessionViewerStore,
  ($store) => $store.highlightedNodes,
);

export const highlightedLinks: Readable<Set<string>> = derived(
  sessionViewerStore,
  ($store) => $store.highlightedLinks,
);

export const zoomLevel: Readable<number> = derived(
  sessionViewerStore,
  ($store) => $store.zoomLevel,
);

export const panOffset: Readable<{ x: number; y: number }> = derived(
  sessionViewerStore,
  ($store) => $store.panOffset,
);

export const sidebarOpen: Readable<boolean> = derived(
  sessionViewerStore,
  ($store) => $store.sidebarOpen,
);

export const filterOptions: Readable<ViewerState["filterOptions"]> = derived(
  sessionViewerStore,
  ($store) => $store.filterOptions,
);

export const acknowledgedAlerts: Readable<Set<string>> = derived(
  sessionViewerStore,
  ($store) => $store.acknowledgedAlerts,
);

export const answeredQuestions: Readable<
  Map<string, { answer: any; confidence: number }>
> = derived(sessionViewerStore, ($store) => $store.answeredQuestions);

// Export main store for direct access if needed
export { sessionViewerStore };
