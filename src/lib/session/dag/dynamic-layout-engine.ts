// Dynamic Layout Engine for AI-Generated DAG Visualization
// Automatically positions nodes based on AI configuration and relationships

export interface LayoutNode {
  id: string;
  name: string;
  type: string;
  category: string;
  x: number;
  y: number;
  layer: number;
  isParallel: boolean;
  parallelGroup?: string;
  parentNodes: string[];
  childNodes: string[];
}

export interface LayoutLink {
  id: string;
  source: string;
  target: string;
  type: 'data_flow' | 'analysis_input' | 'safety_input' | 'bypass_flow' | 'triggers' | 'contributes' | 'consensus' | 'merges';
}

export interface LayoutConfig {
  width: number;
  height: number;
  margins: { top: number; right: number; bottom: number; left: number };
  nodeSpacing: { x: number; y: number };
  parallelSpacing: number;
}

export interface NodeAdditionOptions {
  insertBetween?: { 
    parents: string[]; 
    children: string[]; 
  };
  layer?: number;
  parallelGroup?: string;
  positioning?: 'auto' | 'manual' | 'relative';
}

export interface LayoutResult {
  nodes: LayoutNode[];
  links: LayoutLink[];
  layerCount: number;
  affectedNodeIds: string[];
}

export class DynamicLayoutEngine {
  private config: LayoutConfig;
  private nodes: Map<string, LayoutNode> = new Map();
  private links: LayoutLink[] = [];
  private layers: Map<number, LayoutNode[]> = new Map();

  constructor(config: LayoutConfig) {
    this.config = config;
  }

  /**
   * Generate layout from DAG configuration
   */
  generateLayout(dagConfig: any): LayoutResult {
    console.group('🎯 DAG Layout Generation Starting');
    console.log('🔍 Input DAG config:', {
      id: dagConfig?.id || 'unknown',
      hasDefaultFlow: !!dagConfig?.defaultFlow,
      nodeCount: dagConfig?.defaultFlow?.nodes?.length || 0
    });
    
    this.resetLayout();
    
    // Create nodes from default flow
    this.createNodesFromConfig(dagConfig.defaultFlow);
    
    console.log('✅ Nodes created:', Array.from(this.nodes.keys()));
    
    // Assign layers based on dependencies
    this.assignLayers();
    
    // Calculate positions using auto-layout algorithm
    this.calculatePositions();
    
    console.log('🏁 Layout generation complete');
    console.groupEnd();
    
    return {
      nodes: Array.from(this.nodes.values()),
      links: this.links,
      layerCount: this.layers.size,
      affectedNodeIds: Array.from(this.nodes.keys())
    };
  }

  /**
   * Add a single node with optional relationship management
   */
  addNode(node: LayoutNode, options?: NodeAdditionOptions): LayoutResult {
    return this.addNodes([node], options);
  }

  /**
   * Add multiple nodes with optional relationship management - GENERIC VERSION
   */
  addNodes(nodes: LayoutNode[], options?: NodeAdditionOptions): LayoutResult {
    const affectedNodeIds: string[] = [];
    
    // Add nodes to the internal map
    nodes.forEach(node => {
      this.nodes.set(node.id, node);
      affectedNodeIds.push(node.id);
    });

    // Handle insertBetween option
    if (options?.insertBetween) {
      this.handleInsertBetween(nodes, options.insertBetween, affectedNodeIds);
    }

    // Recalculate entire layout
    this.assignLayers();
    this.calculatePositions();

    return {
      nodes: Array.from(this.nodes.values()),
      links: this.links,
      layerCount: this.layers.size,
      affectedNodeIds
    };
  }

  /**
   * Handle insertion of nodes between existing parent-child relationships
   */
  private handleInsertBetween(
    newNodes: LayoutNode[], 
    insertConfig: { parents: string[]; children: string[] },
    affectedNodeIds: string[]
  ) {
    const { parents: parentIds, children: childIds } = insertConfig;
    
    // Update parent nodes to point to new nodes instead of children
    parentIds.forEach(parentId => {
      const parentNode = this.nodes.get(parentId);
      if (!parentNode) {
        console.warn(`Parent node ${parentId} not found`);
        return;
      }

      // Remove old parent->child connections
      childIds.forEach(childId => {
        const childIndex = parentNode.childNodes.indexOf(childId);
        if (childIndex > -1) {
          parentNode.childNodes.splice(childIndex, 1);
          // Remove corresponding link
          const linkId = `${parentId}_to_${childId}`;
          this.links = this.links.filter(link => link.id !== linkId);
        }
      });

      // Add new parent->newNode connections
      newNodes.forEach(newNode => {
        if (!parentNode.childNodes.includes(newNode.id)) {
          parentNode.childNodes.push(newNode.id);
        }
        if (!newNode.parentNodes.includes(parentId)) {
          newNode.parentNodes.push(parentId);
        }

        // Create parent->newNode link
        const linkId = `${parentId}_to_${newNode.id}`;
        if (!this.links.find(l => l.id === linkId)) {
          this.links.push({
            id: linkId,
            source: parentId,
            target: newNode.id,
            type: 'triggers'
          });
        }
      });

      affectedNodeIds.push(parentId);
    });

    // Update child nodes to receive from new nodes instead of parents
    childIds.forEach(childId => {
      const childNode = this.nodes.get(childId);
      if (!childNode) {
        console.warn(`Child node ${childId} not found`);
        return;
      }

      // Remove old parent->child connections from child's parent list
      parentIds.forEach(parentId => {
        const parentIndex = childNode.parentNodes.indexOf(parentId);
        if (parentIndex > -1) {
          childNode.parentNodes.splice(parentIndex, 1);
        }
      });

      // Add new newNode->child connections
      newNodes.forEach(newNode => {
        if (!childNode.parentNodes.includes(newNode.id)) {
          childNode.parentNodes.push(newNode.id);
        }
        if (!newNode.childNodes.includes(childId)) {
          newNode.childNodes.push(childId);
        }

        // Create newNode->child link
        const linkId = `${newNode.id}_to_${childId}`;
        if (!this.links.find(l => l.id === linkId)) {
          this.links.push({
            id: linkId,
            source: newNode.id,
            target: childId,
            type: 'contributes'
          });
        }
      });

      affectedNodeIds.push(childId);
    });
  }

  /**
   * Add a link between existing nodes
   */
  addLink(link: LayoutLink): LayoutResult {
    // Check if link already exists
    const existingLink = this.links.find(l => l.id === link.id);
    if (existingLink) {
      return {
        nodes: Array.from(this.nodes.values()),
        links: this.links,
        layerCount: this.layers.size,
        affectedNodeIds: []
      };
    }

    this.links.push(link);
    const affectedNodeIds: string[] = [link.source, link.target];

    // Update parent-child relationships
    const sourceNode = this.nodes.get(link.source);
    const targetNode = this.nodes.get(link.target);

    if (sourceNode && !sourceNode.childNodes.includes(link.target)) {
      sourceNode.childNodes.push(link.target);
    }

    if (targetNode && !targetNode.parentNodes.includes(link.source)) {
      targetNode.parentNodes.push(link.source);
    }

    // Recalculate layout if relationships changed
    this.assignLayers();
    this.calculatePositions();

    return {
      nodes: Array.from(this.nodes.values()),
      links: this.links,
      layerCount: this.layers.size,
      affectedNodeIds
    };
  }

  /**
   * Legacy method - now delegates to generic addNodes
   * @deprecated Use addNodes with insertBetween option instead
   */
  addParallelExperts(
    parentNodeId: string, 
    expertDefinitions: any[],
    consensusNodeId: string
  ): LayoutResult {
    // Convert expert definitions to LayoutNodes
    const expertNodes: LayoutNode[] = expertDefinitions.map((expert, index) => ({
      id: expert.expertId,
      name: expert.name || expert.variation?.name || `Expert ${index + 1}`,
      type: 'specialist',
      category: 'ai_generated',
      x: 0,
      y: 0,
      layer: 0, // Will be calculated by addNodes
      isParallel: true,
      parallelGroup: `${parentNodeId}_experts`,
      parentNodes: [], // Will be set by insertBetween
      childNodes: []   // Will be set by insertBetween
    }));

    // Use generic addNodes with insertBetween option
    const result = this.addNodes(expertNodes, {
      insertBetween: {
        parents: [parentNodeId],
        children: [consensusNodeId]
      }
    });

    return result;
  }

  private resetLayout() {
    this.nodes.clear();
    this.links = [];
    this.layers.clear();
  }

  private createNodesFromConfig(defaultFlow: any) {
    console.group('🏗️ Creating nodes from DAG config');
    console.log('📋 Default flow structure:', {
      nodeCount: defaultFlow?.nodes?.length || 0,
      connectionCount: defaultFlow?.connections?.length || 0,
      nodes: defaultFlow?.nodes?.map((n: any) => ({ id: n.id, name: n.name })) || []
    });
    
    // Create nodes from default flow configuration
    defaultFlow.nodes.forEach((nodeConfig: any, index: number) => {
      // Check for data corruption
      if (nodeConfig.id && nodeConfig.id.includes('rr')) {
        console.error(`🚨 DETECTED CORRUPTED NODE ID: '${nodeConfig.id}' at index ${index}`);
        console.error('🔍 Full node config:', nodeConfig);
      }
      
      const node: LayoutNode = {
        id: nodeConfig.id,
        name: nodeConfig.name,
        type: nodeConfig.type,
        category: nodeConfig.category || 'default',
        x: 0, // Will be calculated
        y: 0, // Will be calculated
        layer: 0, // Will be calculated
        isParallel: false,
        parentNodes: [], // Will be calculated from connections
        childNodes: [] // Will be calculated from connections
      };
      
      console.log(`📦 Created node: ${node.id} (${node.name})`);
      this.nodes.set(node.id, node);
    });
    
    console.groupEnd();

    // Create links and parent/child relationships from connections
    defaultFlow.connections.forEach((conn: any) => {
      this.links.push({
        id: `${conn.from}_to_${conn.to}`,
        source: conn.from,
        target: conn.to,
        type: conn.type || 'data_flow'
      });
      
      // Update parent-child relationships
      const sourceNode = this.nodes.get(conn.from);
      const targetNode = this.nodes.get(conn.to);
      
      if (sourceNode && targetNode) {
        // Source node has this target as a child
        if (!sourceNode.childNodes.includes(conn.to)) {
          sourceNode.childNodes.push(conn.to);
        }
        
        // Target node has this source as a parent
        if (!targetNode.parentNodes.includes(conn.from)) {
          targetNode.parentNodes.push(conn.from);
        }
      }
    });
  }

  private assignLayers() {
    this.layers.clear();
    
    // Initialize all nodes to layer 0
    const nodeLayers = new Map<string, number>();
    Array.from(this.nodes.values()).forEach(node => {
      nodeLayers.set(node.id, 0);
    });
    
    // Find root nodes (no parents)
    const rootNodes = Array.from(this.nodes.values()).filter(n => n.parentNodes.length === 0);
    
    // Recursively assign layers using depth-first search
    const assignNodeLayer = (nodeId: string, currentLayer: number, visited: Set<string>): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = this.nodes.get(nodeId);
      if (!node) return;
      
      // Update layer to be the maximum of current assignment and new layer
      const newLayer = Math.max(nodeLayers.get(nodeId) || 0, currentLayer);
      nodeLayers.set(nodeId, newLayer);
      node.layer = newLayer;
      
      // Process children at the next layer
      node.childNodes.forEach(childId => {
        assignNodeLayer(childId, newLayer + 1, visited);
      });
    };
    
    // Start with root nodes at layer 0
    const globalVisited = new Set<string>();
    rootNodes.forEach(rootNode => {
      assignNodeLayer(rootNode.id, 0, globalVisited);
    });
    
    // Group nodes by layer
    Array.from(this.nodes.values()).forEach(node => {
      const layer = node.layer;
      if (!this.layers.has(layer)) {
        this.layers.set(layer, []);
      }
      this.layers.get(layer)!.push(node);
    });
    
    console.log('📊 Assigned layers:', {
      totalLayers: this.layers.size,
      layerDistribution: Array.from(this.layers.entries()).map(([layer, nodes]) => ({
        layer,
        nodeCount: nodes.length,
        nodeIds: nodes.map(n => n.id)
      }))
    });
  }

  private calculatePositions() {
    const { width, height, margins, nodeSpacing, parallelSpacing } = this.config;
    const usableWidth = width - margins.left - margins.right;
    const usableHeight = height - margins.top - margins.bottom;
    
    const maxLayer = Math.max(...Array.from(this.layers.keys()));
    const layerHeight = maxLayer > 0 ? usableHeight / (maxLayer + 1) : usableHeight;
    
    console.log('📊 Positioning nodes:', {
      totalLayers: maxLayer + 1,
      layerHeight,
      usableWidth,
      usableHeight
    });
    
    // Position nodes layer by layer (top to bottom)
    this.layers.forEach((layerNodes, layer) => {
      const y = margins.top + (layer * layerHeight) + (layerHeight / 2);
      
      // Group parallel nodes
      const parallelGroups = new Map<string, LayoutNode[]>();
      const regularNodes: LayoutNode[] = [];
      
      layerNodes.forEach(node => {
        if (node.isParallel && node.parallelGroup) {
          if (!parallelGroups.has(node.parallelGroup)) {
            parallelGroups.set(node.parallelGroup, []);
          }
          parallelGroups.get(node.parallelGroup)!.push(node);
        } else {
          regularNodes.push(node);
        }
      });
      
      // Calculate horizontal positioning
      const totalItems = regularNodes.length + parallelGroups.size;
      
      if (totalItems === 1) {
        // Center single node or group
        if (regularNodes.length === 1) {
          regularNodes[0].x = margins.left + (usableWidth / 2);
          regularNodes[0].y = y;
        } else if (parallelGroups.size === 1) {
          // Center parallel group
          const groupNodes = Array.from(parallelGroups.values())[0];
          const groupCenterX = margins.left + (usableWidth / 2);
          
          // Dynamic spacing: use larger spacing for fewer nodes, smaller for many nodes
          const dynamicSpacing = Math.max(
            parallelSpacing,
            Math.min(250, usableWidth / (groupNodes.length + 1))  // Cap at 250px max
          );
          
          const groupStartX = groupCenterX - ((groupNodes.length - 1) * dynamicSpacing) / 2;
          
          groupNodes.forEach((node, index) => {
            node.x = groupStartX + (index * dynamicSpacing);
            node.y = y;
          });
          
          console.log(`📏 Positioned ${groupNodes.length} parallel nodes with ${dynamicSpacing}px spacing`);
        }
      } else {
        // Distribute multiple items across the width
        const itemSpacing = usableWidth / totalItems;
        let itemIndex = 0;
        
        // Position regular nodes
        regularNodes.forEach(node => {
          node.x = margins.left + (itemIndex * itemSpacing) + (itemSpacing / 2);
          node.y = y;
          itemIndex++;
        });
        
        // Position parallel groups
        parallelGroups.forEach(groupNodes => {
          const groupCenterX = margins.left + (itemIndex * itemSpacing) + (itemSpacing / 2);
          
          // Dynamic spacing for parallel nodes in mixed layers
          const dynamicSpacing = Math.max(
            parallelSpacing,
            Math.min(250, itemSpacing / (groupNodes.length + 1))  // Adapt to available space
          );
          
          const groupStartX = groupCenterX - ((groupNodes.length - 1) * dynamicSpacing) / 2;
          
          groupNodes.forEach((node, index) => {
            node.x = groupStartX + (index * dynamicSpacing);
            node.y = y;
          });
          
          itemIndex++;
        });
      }
      
      console.log(`📊 Layer ${layer} positioned:`, layerNodes.map(n => ({ id: n.id, x: n.x, y: n.y })));
    });
  }

  private createConsensusNode(consensusNodeId: string, layer: number): LayoutNode {
    return {
      id: consensusNodeId,
      name: 'Expert Consensus',
      type: 'consensus',
      category: 'consensus',
      x: 0, // Will be calculated
      y: 0, // Will be calculated
      layer,
      isParallel: false,
      parentNodes: [], // Will be set by caller
      childNodes: []
    };
  }

  /**
   * Get layout configuration for visualization
   */
  getLayoutMetrics() {
    const layerCount = this.layers.size;
    const maxParallelNodes = Math.max(...Array.from(this.layers.values()).map(layer => 
      layer.filter(n => n.isParallel).length
    ));
    
    return {
      totalNodes: this.nodes.size,
      totalLayers: layerCount,
      maxParallelNodes,
      layoutDensity: this.nodes.size / (layerCount || 1)
    };
  }
}

// Default layout configuration
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  width: 1200,
  height: 800,
  margins: { top: 60, right: 60, bottom: 60, left: 60 },
  nodeSpacing: { x: 200, y: 150 },
  parallelSpacing: 180  // Increased from 120 to prevent overlap
};

// Helper function to create layout engine
export function createLayoutEngine(config?: Partial<LayoutConfig>): DynamicLayoutEngine {
  const fullConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  return new DynamicLayoutEngine(fullConfig);
}