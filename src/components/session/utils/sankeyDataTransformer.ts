import type { SessionAnalysis, SankeyData, SankeyNode, SankeyLink } from '../types/visualization';

/**
 * Transform MoE session analysis JSON to D3 Sankey format
 * Handles embedded relationships and creates proper node/link structures
 */
export function transformToSankeyData(sessionData: SessionAnalysis): SankeyData {
    console.log('Transforming session data:', {
        hasNodes: !!sessionData.nodes,
        symptoms: sessionData.nodes?.symptoms?.length || 0,
        diagnoses: sessionData.nodes?.diagnoses?.length || 0,
        treatments: sessionData.nodes?.treatments?.length || 0
    });

    const nodes: SankeyNode[] = [];
    const links: SankeyLink[] = [];
    const nodeMap = new Map<string, SankeyNode>();

    // Validate input data
    if (!sessionData || !sessionData.nodes) {
        console.error('Invalid session data:', sessionData);
        return { nodes: [], links: [], metadata: { sessionId: '', analysisVersion: 0, timestamp: '' } };
    }

    // Process symptoms (Column 1)
    const symptoms = sessionData.nodes.symptoms || [];
    // Sort by severity (most severe first)
    symptoms.sort((a, b) => (a.severity || 5) - (b.severity || 5));
    
    symptoms.forEach((symptom, index) => {
        const node: SankeyNode = {
            id: symptom.id,
            name: symptom.text,
            type: 'symptom',
            column: 0,
            priority: symptom.severity || 5,
            confidence: symptom.confidence || 0.5,
            source: symptom.source || 'transcript',
            data: symptom,
            x: 0, // Will be calculated by D3 Sankey
            y: index * 80,
            color: getNodeColor('symptom', symptom.severity || 5, symptom.source),
            // Calculate node value (height) based on severity and confidence
            value: calculateNodeValue(symptom.severity || 5, symptom.confidence || 0.5)
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
    });

    // Process diagnoses (Column 2)
    const diagnoses = sessionData.nodes.diagnoses || [];
    // Sort by priority (most critical first) and then by probability (highest first)
    diagnoses.sort((a, b) => {
        const aCoeff = calculateNodeValue(a.priority || 5, a.probability || 0.5);
        const bCoeff = calculateNodeValue(b.priority || 5, b.probability || 0.5);
        return bCoeff - aCoeff; // Descending order (highest coefficient first)
    });
    
    diagnoses.forEach((diagnosis, index) => {
        const node: SankeyNode = {
            id: diagnosis.id,
            name: diagnosis.name,
            type: 'diagnosis',
            column: 1,
            priority: diagnosis.priority || 5,
            confidence: diagnosis.confidence || diagnosis.probability || 0.5,
            probability: diagnosis.probability,
            data: diagnosis,
            x: 0, // Will be calculated by D3 Sankey
            y: index * 80,
            color: getNodeColor('diagnosis', diagnosis.priority || 5),
            // Calculate node value based on priority and probability
            value: calculateNodeValue(diagnosis.priority || 5, diagnosis.probability || 0.5)
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
    });

    // Process treatments (Column 3)
    const treatments = sessionData.nodes.treatments || [];
    // Sort by priority (most critical first) and then by effectiveness
    treatments.sort((a, b) => {
        const aCoeff = calculateNodeValue(a.priority || 5, a.effectiveness || 0.5);
        const bCoeff = calculateNodeValue(b.priority || 5, b.effectiveness || 0.5);
        return bCoeff - aCoeff; // Descending order (highest coefficient first)
    });
    
    treatments.forEach((treatment, index) => {
        const node: SankeyNode = {
            id: treatment.id,
            name: treatment.name,
            type: 'treatment', 
            column: 2,
            priority: treatment.priority || 5,
            confidence: treatment.confidence || treatment.effectiveness || 0.5,
            data: treatment,
            x: 0, // Will be calculated by D3 Sankey  
            y: index * 80,
            color: getNodeColor('treatment', treatment.priority || 5),
            // Calculate node value based on priority and effectiveness
            value: calculateNodeValue(treatment.priority || 5, treatment.effectiveness || 0.5)
        };
        nodes.push(node);
        nodeMap.set(node.id, node);
    });

    // Skip actions for now to simplify debugging
    // TODO: Re-enable actions after core flow is working
    // sessionData.nodes.actions?.forEach((action, index) => {
    //     const node: SankeyNode = {
    //         id: action.id,
    //         name: action.text,
    //         type: action.actionType === 'question' ? 'question' : 'alert',
    //         column: getActionColumn(action, nodeMap),
    //         priority: action.priority || 5,
    //         confidence: 1.0,
    //         data: action,
    //         x: getActionXPosition(action, nodeMap),
    //         y: 400 + (index * 60), // Position actions below main flow
    //         color: getNodeColor(action.actionType === 'question' ? 'question' : 'alert', action.priority || 5)
    //     };
    //     nodes.push(node);
    //     nodeMap.set(node.id, node);
    // });

    // Create simple forward-flowing links only: symptoms -> diagnoses -> treatments
    nodes.forEach(sourceNode => {
        if (sourceNode.type !== 'symptom' && sourceNode.type !== 'diagnosis') return;
        
        const relationships = sourceNode.data.relationships || [];
        relationships.forEach((rel: any) => {
            const targetNode = nodeMap.get(rel.nodeId);
            if (!targetNode) {
                console.log(`Target node not found: ${rel.nodeId} for source ${sourceNode.id}`);
                return;
            }
            
            // Only create forward-flowing links
            let shouldCreateLink = false;
            if (sourceNode.type === 'symptom' && targetNode.type === 'diagnosis') {
                shouldCreateLink = true;
                console.log(`Creating symptom->diagnosis link: ${sourceNode.id} -> ${targetNode.id}`);
            } else if (sourceNode.type === 'diagnosis' && targetNode.type === 'treatment') {
                shouldCreateLink = true;
                console.log(`Creating diagnosis->treatment link: ${sourceNode.id} -> ${targetNode.id}`);
            } else {
                console.log(`Skipped link: ${sourceNode.type}(${sourceNode.id}) -> ${targetNode.type}(${targetNode.id}), direction: ${rel.direction}`);
            }
            
            if (shouldCreateLink && rel.direction === 'outgoing') {
                const linkKey = `${sourceNode.id}-${targetNode.id}`;
                
                // Avoid duplicates
                if (!links.find(l => `${l.source}-${l.target}` === linkKey)) {
                    const link: SankeyLink = {
                        source: sourceNode.id,
                        target: targetNode.id,
                        value: Math.max(1, rel.strength * 20), // Scale for visibility
                        type: rel.relationship,
                        strength: rel.strength,
                        reasoning: rel.reasoning,
                        direction: rel.direction
                    };
                    
                    links.push(link);
                }
            }
        });
    });

    console.log('Transformation complete:', {
        nodeCount: nodes.length,
        linkCount: links.length,
        nodeTypes: nodes.map(n => n.type),
        nodeValues: nodes.map(n => ({ 
            id: n.id, 
            type: n.type, 
            priority: n.priority, 
            confidence: n.confidence, 
            value: n.value 
        })),
        linksDetail: links.map(l => `${l.source} -> ${l.target} (${l.value})`)
    });

    return {
        nodes,
        links,
        metadata: {
            sessionId: sessionData.sessionId,
            analysisVersion: sessionData.analysisVersion,
            timestamp: sessionData.timestamp
        }
    };
}

/**
 * Calculate node value (affects height) based on priority/severity and probability
 * Priority scale: 1 (critical) to 10 (low)
 * Probability/confidence/effectiveness: 0 to 1
 * Formula: (11 - priority) * probability * 100
 */
function calculateNodeValue(priority: number, probability: number): number {
    // Invert priority so higher severity = higher value
    const severityWeight = 11 - Math.max(1, Math.min(10, priority));
    const probWeight = Math.max(0, Math.min(1, probability));
    
    // Base value between 20-200 for reasonable Sankey heights
    const baseValue = 20;
    const multiplier = 18; // Adjust this to control max height difference
    
    return baseValue + (severityWeight * probWeight * multiplier);
}

/**
 * Get appropriate color for node based on type and priority
 */
function getNodeColor(type: string, priority: number = 5, source?: string): string {
    // Priority-based intensity (1=critical/dark, 10=low/light)
    const intensity = Math.max(0.3, 1 - (priority - 1) / 9 * 0.7);
    
    switch (type) {
        case 'symptom':
            if (source === 'suspected') return `hsla(30, 70%, 60%, ${intensity})`; // Orange for suspected
            if (source === 'medical_history') return `hsla(200, 60%, 60%, ${intensity})`; // Blue for history
            if (source === 'family_history') return `hsla(280, 60%, 60%, ${intensity})`; // Purple for family
            return `hsla(120, 60%, 60%, ${intensity})`; // Green for transcript
        case 'diagnosis':
            return `hsla(220, 70%, 60%, ${intensity})`; // Blue
        case 'treatment':
            return `hsla(160, 70%, 60%, ${intensity})`; // Teal
        case 'question':
            return `hsla(40, 80%, 60%, ${intensity})`; // Yellow
        case 'alert':
            return `hsla(0, 80%, 60%, ${intensity})`; // Red
        default:
            return `hsla(0, 0%, 60%, ${intensity})`; // Gray
    }
}

/**
 * Determine which column an action should be positioned in based on its relationships
 */
function getActionColumn(action: any, nodeMap: Map<string, SankeyNode>): number {
    const relationships = action.relationships || [];
    
    // Find the average column of connected nodes
    let totalColumn = 0;
    let count = 0;
    
    relationships.forEach(rel => {
        const relatedNode = nodeMap.get(rel.nodeId);
        if (relatedNode) {
            totalColumn += relatedNode.column;
            count++;
        }
    });
    
    return count > 0 ? Math.round(totalColumn / count) : 1; // Default to middle column
}

/**
 * Calculate X position for actions based on their target column
 */
function getActionXPosition(action: any, nodeMap: Map<string, SankeyNode>): number {
    const column = getActionColumn(action, nodeMap);
    const columnWidth = 300;
    return column * columnWidth + 150; // Center between columns
}

/**
 * Calculate optimal node sizes based on priority and type
 */
export function calculateNodeSize(node: SankeyNode, isMobile: boolean = false): { width: number; height: number } {
    const baseFactor = isMobile ? 0.7 : 1.0;
    
    // Size based on priority (1=critical/large, 10=low/small)  
    const priorityFactor = Math.max(0.5, 1.2 - (node.priority - 1) / 9 * 0.7);
    
    let baseWidth = 120;
    let baseHeight = 60;
    
    // Type-specific sizing
    switch (node.type) {
        case 'symptom':
            baseWidth = 100;
            baseHeight = 50;
            break;
        case 'diagnosis':
            baseWidth = 140;
            baseHeight = 70;
            break;
        case 'treatment':
            baseWidth = 130;
            baseHeight = 65;
            break;
        case 'question':
        case 'alert':
            baseWidth = 80;
            baseHeight = 40;
            break;
    }
    
    return {
        width: Math.round(baseWidth * baseFactor * priorityFactor),
        height: Math.round(baseHeight * baseFactor * priorityFactor)
    };
}

/**
 * Extract node ID from D3 Sankey source/target (which can be string, number, or SankeyNode)
 */
function getNodeId(nodeRef: string | number | SankeyNode): string {
    if (typeof nodeRef === 'string') return nodeRef;
    if (typeof nodeRef === 'number') return nodeRef.toString();
    return nodeRef.id;
}

/**
 * Check if a link should be skipped to maintain Sankey flow direction
 */
function shouldSkipLink(sourceNode: SankeyNode, targetNode: SankeyNode): boolean {
    // Allow actions (questions/alerts) to connect anywhere
    if (sourceNode.type === 'question' || sourceNode.type === 'alert' ||
        targetNode.type === 'question' || targetNode.type === 'alert') {
        return false;
    }
    
    // Enforce main flow: symptoms(0) -> diagnoses(1) -> treatments(2)
    if (sourceNode.column > targetNode.column) {
        return true; // Would create backward flow
    }
    
    return false;
}

/**
 * Remove cycles from links using topological sorting approach
 */
function removeCycles(links: SankeyLink[], nodes: SankeyNode[]): SankeyLink[] {
    const nodeSet = new Set(nodes.map(n => n.id));
    const validLinks: SankeyLink[] = [];
    const graph = new Map<string, Set<string>>();
    
    // Initialize graph
    nodes.forEach(node => {
        graph.set(node.id, new Set());
    });
    
    // Add links one by one, checking for cycles
    for (const link of links) {
        // Extract string IDs from source/target
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);
        
        // Ensure both nodes exist
        if (!nodeSet.has(sourceId) || !nodeSet.has(targetId)) {
            continue;
        }
        
        // Skip self-loops
        if (sourceId === targetId) {
            continue;
        }
        
        // Temporarily add edge and check for cycles
        graph.get(sourceId)!.add(targetId);
        
        if (hasCycle(graph, nodes.map(n => n.id))) {
            // Remove the edge that would create a cycle
            graph.get(sourceId)!.delete(targetId);
            console.warn(`Skipping link ${sourceId} -> ${targetId} to prevent cycle`);
        } else {
            // Keep this link
            validLinks.push(link);
        }
    }
    
    return validLinks;
}

/**
 * Detect cycles in directed graph using DFS
 */
function hasCycle(graph: Map<string, Set<string>>, nodeIds: string[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    function dfs(nodeId: string): boolean {
        if (recursionStack.has(nodeId)) {
            return true; // Cycle detected
        }
        
        if (visited.has(nodeId)) {
            return false; // Already processed
        }
        
        visited.add(nodeId);
        recursionStack.add(nodeId);
        
        const neighbors = graph.get(nodeId) || new Set();
        for (const neighbor of neighbors) {
            if (dfs(neighbor)) {
                return true;
            }
        }
        
        recursionStack.delete(nodeId);
        return false;
    }
    
    // Check each unvisited node
    for (const nodeId of nodeIds) {
        if (!visited.has(nodeId)) {
            if (dfs(nodeId)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Get link color based on relationship type
 */
export function getLinkColor(relationship: string): string {
    switch (relationship) {
        case 'supports':
        case 'confirms': 
            return '#4ade80'; // Green
        case 'contradicts':
        case 'rules_out':
            return '#f87171'; // Red  
        case 'treats':
        case 'manages':
            return '#60a5fa'; // Blue
        case 'investigates':
        case 'clarifies':
            return '#a78bfa'; // Purple
        case 'suggests':
        case 'indicates':
            return '#fb923c'; // Orange
        default:
            return '#6b7280'; // Gray
    }
}