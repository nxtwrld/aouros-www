// DAG Execution Store
// Manages the dynamic state of the DAG execution with real-time updates

import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import type { 
  DAGNode, 
  DAGLink, 
  DAGExecutionState, 
  DAGEvent,
  D3DAGNode,
  D3DAGLink,
  NodeStartedEvent,
  NodeCompletedEvent,
  NodeFailedEvent,
  ExpertTriggeredEvent,
  RelationshipAddedEvent
} from '$components/session/types/dag';
import { createLayoutEngine, DEFAULT_LAYOUT_CONFIG } from '$lib/session/dag/dynamic-layout-engine';
import type { LayoutNode, LayoutLink } from '$lib/session/dag/dynamic-layout-engine';
import dagConfiguration from "virtual:dag-config";

// Store interfaces
interface DAGStoreState {
  nodes: Map<string, DAGNode>;
  links: Map<string, DAGLink>;
  nodeStates: Map<string, string>; // nodeId -> state
  executionState: DAGExecutionState;
  lastUpdate: number;
  configuration?: any; // Dynamic configuration from /config
  layoutEngine?: any; // Dynamic layout engine instance
}

// Initialize store with default state
function createInitialState(): DAGStoreState {
  const nodes = new Map<string, DAGNode>();
  const links = new Map<string, DAGLink>();
  
  // Use imported configuration
  const configuration = dagConfiguration;
  const layoutEngine = createLayoutEngine(DEFAULT_LAYOUT_CONFIG);
  
  // Generate layout from configuration synchronously
  const { nodes: layoutNodes, links: layoutLinks } = layoutEngine.generateLayout(configuration);
  
  // Convert layout nodes to DAG nodes
  layoutNodes.forEach(layoutNode => {
    const node: DAGNode = {
      id: layoutNode.id,
      name: layoutNode.name,
      type: layoutNode.type as DAGNode['type'],
      category: layoutNode.category,
      layer: layoutNode.layer,
      parent: layoutNode.parentNodes[0], // Take first parent as primary
      children: layoutNode.childNodes,
      state: 'pending',
      provider: 'openai',
      model: 'gpt-4',
      x: layoutNode.x,
      y: layoutNode.y
    };
    nodes.set(node.id, node);
  });
  
  // Convert layout links to DAG links
  layoutLinks.forEach(layoutLink => {
    const link: DAGLink = {
      id: layoutLink.id,
      source: layoutLink.source,
      target: layoutLink.target,
      type: layoutLink.type as DAGLink['type'],
      direction: 'forward',
      strength: 0.6,
      active: true  // Default flow links should be active to show proper arrows
    };
    links.set(link.id, link);
  });
  
  
  return {
    nodes,
    links,
    nodeStates: new Map(),
    configuration,
    layoutEngine,
    executionState: {
      sessionId: '',
      dagModelId: configuration.id,
      status: 'idle',
      currentLayer: 0,
      activeNodes: [],
      completedNodes: [],
      failedNodes: [],
      totalNodes: nodes.size,
      totalCost: 0,
      totalDuration: 0,
      successRate: 0
    },
    lastUpdate: Date.now()
  };
}

// Main store - now synchronous
const dagStore: Writable<DAGStoreState> = writable(createInitialState());

// Derived store for D3 data format
export const d3DAGData: Readable<{ nodes: D3DAGNode[], links: D3DAGLink[] }> = derived(
  dagStore,
  ($dagStore) => {
    // Handle asynchronous initialization
    if (!$dagStore || !$dagStore.nodes) {
      return { nodes: [], links: [] };
    }
    
    const nodes: D3DAGNode[] = [];
    const links: D3DAGLink[] = [];
    
    // Convert nodes to D3 format
    $dagStore.nodes.forEach(node => {
      const d3Node: D3DAGNode = {
        ...node,
        x: node.x || 0,
        y: node.y || 0
      };
      nodes.push(d3Node);
    });
    
    // Convert links to D3 format with node references
    $dagStore.links.forEach(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);
      
      if (sourceNode && targetNode) {
        const d3Link: D3DAGLink = {
          ...link,
          source: sourceNode,
          target: targetNode
        };
        links.push(d3Link);
      }
    });
    
    return { nodes, links };
  }
);

// Derived store for execution metrics
export const dagMetrics = derived(
  dagStore,
  ($dagStore) => {
    // Handle asynchronous initialization
    if (!$dagStore || !$dagStore.executionState) {
      return {
        totalNodes: 0,
        completedNodes: 0,
        failedNodes: 0,
        activeNodes: 0,
        pendingNodes: 0,
        successRate: 0,
        totalCost: 0,
        totalDuration: 0,
        status: 'idle' as const
      };
    }
    
    const { executionState } = $dagStore;
    const nodeCount = $dagStore.nodes.size;
    const completedCount = executionState.completedNodes.length;
    const failedCount = executionState.failedNodes.length;
    const activeCount = executionState.activeNodes.length;
    
    return {
      totalNodes: nodeCount,
      completedNodes: completedCount,
      failedNodes: failedCount,
      activeNodes: activeCount,
      pendingNodes: nodeCount - completedCount - failedCount - activeCount,
      successRate: nodeCount > 0 ? (completedCount / nodeCount) * 100 : 0,
      totalCost: executionState.totalCost,
      totalDuration: executionState.totalDuration,
      status: executionState.status
    };
  }
);

// Store actions
export const dagActions = {
  // Initialize DAG for a session
  initialize(sessionId: string) {
    dagStore.update(state => {
      state.executionState.sessionId = sessionId;
      state.executionState.status = 'initializing';
      state.lastUpdate = Date.now();
      return state;
    });
  },
  
  // Reset DAG to initial state
  reset() {
    dagStore.set(createInitialState());
  },
  
  // Update node state
  updateNodeState(nodeId: string, newState: DAGNode['state'], data?: Partial<DAGNode>) {
    dagStore.update(state => {
      const node = state.nodes.get(nodeId);
      if (node) {
        node.state = newState;
        if (data) {
          Object.assign(node, data);
        }
        
        // Update execution state
        const execState = state.executionState;
        
        // Remove from all arrays first
        execState.activeNodes = execState.activeNodes.filter(id => id !== nodeId);
        execState.completedNodes = execState.completedNodes.filter(id => id !== nodeId);
        execState.failedNodes = execState.failedNodes.filter(id => id !== nodeId);
        
        // Add to appropriate array
        if (newState === 'running') {
          execState.activeNodes.push(nodeId);
        } else if (newState === 'completed') {
          execState.completedNodes.push(nodeId);
        } else if (newState === 'failed') {
          execState.failedNodes.push(nodeId);
        }
        
        // Update success rate
        const total = state.nodes.size;
        execState.successRate = total > 0 ? (execState.completedNodes.length / total) * 100 : 0;
      }
      
      state.lastUpdate = Date.now();
      return state;
    });
  },
  
  // Add a new node dynamically (when expert triggers sub-expert)
  addNode(node: DAGNode) {
    dagStore.update(state => {
      state.nodes.set(node.id, node);
      
      // Update parent's children
      if (node.parent) {
        const parent = state.nodes.get(node.parent);
        if (parent && !parent.children.includes(node.id)) {
          parent.children.push(node.id);
        }
      }
      
      state.executionState.totalNodes = state.nodes.size;
      state.lastUpdate = Date.now();
      return state;
    });
  },
  
  // Add a new link
  addLink(link: DAGLink) {
    dagStore.update(state => {
      state.links.set(link.id, link);
      state.lastUpdate = Date.now();
      return state;
    });
  },
  
  // Activate a link (when relationship becomes active)
  activateLink(linkId: string) {
    dagStore.update(state => {
      const link = state.links.get(linkId);
      if (link) {
        link.active = true;
      }
      state.lastUpdate = Date.now();
      return state;
    });
  },
  
  // Update link properties
  updateLink(linkId: string, updates: Partial<DAGLink>) {
    dagStore.update(state => {
      const link = state.links.get(linkId);
      if (link) {
        Object.assign(link, updates);
      }
      state.lastUpdate = Date.now();
      return state;
    });
  },
  
  // Process DAG event from SSE
  processEvent(event: DAGEvent) {
    switch (event.type) {
      case 'dag_initialized':
        dagStore.update(state => {
          // Clear and rebuild from event data
          state.nodes.clear();
          state.links.clear();
          
          event.nodes.forEach(node => {
            state.nodes.set(node.id, node);
          });
          
          event.links.forEach(link => {
            state.links.set(link.id, link);
          });
          
          state.executionState.status = 'running';
          state.lastUpdate = Date.now();
          return state;
        });
        break;
        
      case 'node_started':
        const startEvent = event as NodeStartedEvent;
        dagActions.updateNodeState(startEvent.nodeId, 'running', {
          startTime: startEvent.timestamp
        });
        break;
        
      case 'node_completed':
        const completeEvent = event as NodeCompletedEvent;
        dagActions.updateNodeState(completeEvent.nodeId, 'completed', {
          endTime: Date.now(),
          duration: completeEvent.duration,
          cost: completeEvent.cost,
          tokenUsage: completeEvent.tokenUsage,
          output: completeEvent.output
        });
        
        // Update total metrics
        dagStore.update(state => {
          state.executionState.totalCost += completeEvent.cost || 0;
          state.executionState.totalDuration += completeEvent.duration || 0;
          state.lastUpdate = Date.now();
          return state;
        });
        break;
        
      case 'node_failed':
        const failEvent = event as NodeFailedEvent;
        dagActions.updateNodeState(failEvent.nodeId, 'failed', {
          error: failEvent.error
        });
        break;
        
      case 'expert_triggered':
        const triggerEvent = event as ExpertTriggeredEvent;
        
        // Get current state for dynamic layout calculation
        const currentState = get(dagStore);
        if (!currentState.layoutEngine) break;
        
        // Create new expert node
        const newNode: DAGNode = {
          id: triggerEvent.expertId,
          name: triggerEvent.expertName,
          type: 'specialist',
          category: triggerEvent.expertName.toLowerCase(),
          layer: triggerEvent.layer,
          parent: triggerEvent.parentId,
          children: [],
          state: 'pending',
          provider: 'openai',
          model: 'gpt-4',
          triggerConditions: triggerEvent.triggerConditions,
          triggered: true,
          x: 0, // Will be calculated by layout engine
          y: 0  // Will be calculated by layout engine
        };
        
        // Use layout engine to position the new expert
        if (triggerEvent.parallelGroup) {
          // This is part of a parallel expert group - handle with layout engine
          dagActions.addParallelExpert(triggerEvent);
        } else {
          // Single expert addition
          dagActions.addNode(newNode);
          
          // Create trigger link
          const newLink: DAGLink = {
            id: `${triggerEvent.parentId}_to_${triggerEvent.expertId}`,
            source: triggerEvent.parentId,
            target: triggerEvent.expertId,
            type: 'triggers',
            direction: 'forward',
            strength: 0.6,
            active: true
          };
          
          dagActions.addLink(newLink);
        }
        break;
        
      case 'relationship_added':
        const relEvent = event as RelationshipAddedEvent;
        const relLink: DAGLink = {
          id: relEvent.linkId,
          source: relEvent.sourceId,
          target: relEvent.targetId,
          type: relEvent.relationshipType as any,
          direction: relEvent.direction,
          strength: 0.5,
          active: true
        };
        dagActions.addLink(relLink);
        break;
        
      case 'dag_completed':
        dagStore.update(state => {
          state.executionState.status = 'completed';
          state.executionState.totalCost = event.totalCost;
          state.executionState.totalDuration = event.totalDuration;
          state.lastUpdate = Date.now();
          return state;
        });
        break;
    }
  },
  
  // Update node positions (from D3 force simulation)
  updateNodePositions(positions: Map<string, { x: number, y: number, fx?: number, fy?: number }>) {
    dagStore.update(state => {
      positions.forEach((pos, nodeId) => {
        const node = state.nodes.get(nodeId);
        if (node) {
          node.x = pos.x;
          node.y = pos.y;
          if (pos.fx !== undefined) node.fx = pos.fx;
          if (pos.fy !== undefined) node.fy = pos.fy;
        }
      });
      return state;
    });
  },
  
  // Fix node position (pin it)
  fixNodePosition(nodeId: string, x: number, y: number) {
    dagStore.update(state => {
      const node = state.nodes.get(nodeId);
      if (node) {
        node.fx = x;
        node.fy = y;
      }
      state.lastUpdate = Date.now();
      return state;
    });
  },
  
  // Release node position (unpin it)
  releaseNodePosition(nodeId: string) {
    dagStore.update(state => {
      const node = state.nodes.get(nodeId);
      if (node) {
        node.fx = undefined;
        node.fy = undefined;
      }
      state.lastUpdate = Date.now();
      return state;
    });
  },
  
  // Add parallel expert using layout engine
  addParallelExpert(triggerEvent: ExpertTriggeredEvent) {
    dagStore.update(state => {
      if (!state.layoutEngine) return state;
      
      // Create expert definition for layout engine
      const expertDefinition = {
        expertId: triggerEvent.expertId,
        name: triggerEvent.expertName,
        variation: triggerEvent.expertVariation
      };
      
      // Add parallel expert using layout engine
      const layoutResult = state.layoutEngine.addParallelExperts(
        triggerEvent.parentId,
        [expertDefinition],
        'consensus_merger'
      );
      
      // Update all nodes with new positions
      layoutResult.nodes.forEach((layoutNode: LayoutNode) => {
        const existingNode = state.nodes.get(layoutNode.id);
        if (existingNode) {
          // Update existing node position
          existingNode.x = layoutNode.x;
          existingNode.y = layoutNode.y;
        } else if (layoutNode.id === triggerEvent.expertId) {
          // Create new expert node
          const newNode: DAGNode = {
            id: layoutNode.id,
            name: layoutNode.name,
            type: layoutNode.type as DAGNode['type'],
            category: layoutNode.category,
            layer: layoutNode.layer,
            parent: triggerEvent.parentId,
            children: layoutNode.childNodes,
            state: 'pending',
            provider: 'openai',
            model: 'gpt-4',
            triggerConditions: triggerEvent.triggerConditions,
            triggered: true,
            x: layoutNode.x,
            y: layoutNode.y
          };
          state.nodes.set(newNode.id, newNode);
        }
      });
      
      // Update all links
      layoutResult.links.forEach((layoutLink: LayoutLink) => {
        if (!state.links.has(layoutLink.id)) {
          const newLink: DAGLink = {
            id: layoutLink.id,
            source: layoutLink.source,
            target: layoutLink.target,
            type: layoutLink.type as DAGLink['type'],
            direction: 'forward',
            strength: 0.6,
            active: true
          };
          state.links.set(newLink.id, newLink);
        }
      });
      
      state.executionState.totalNodes = state.nodes.size;
      state.lastUpdate = Date.now();
      return state;
    });
  }
};

// Export stores and actions
export { dagStore };