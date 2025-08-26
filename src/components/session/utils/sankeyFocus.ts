/**
 * Sankey Diagram Focus and Selection Utilities
 * Handles focus management, selection state, and highlighting logic
 */

import * as d3 from 'd3';
import type { SankeyNode, SankeyLink } from '../types/visualization';
import * as viewerStoreModule from '$lib/session/stores/session-viewer-store';

/**
 * Build focusable nodes list ordered by medical workflow
 */
export function buildFocusableNodesList(sankeyData: any): SankeyNode[] {
    if (!sankeyData.nodes) return [];
    
    // Order nodes by medical workflow: symptoms -> diagnoses -> treatments
    const orderedNodes: SankeyNode[] = [
        ...sankeyData.nodes.filter((n: any) => n.type === 'symptom'),
        ...sankeyData.nodes.filter((n: any) => n.type === 'diagnosis'),
        ...sankeyData.nodes.filter((n: any) => n.type === 'treatment'),
        ...sankeyData.nodes.filter((n: any) => !['symptom', 'diagnosis', 'treatment'].includes(n.type))
    ];
    
    return orderedNodes;
}

/**
 * Update node focus state with visual feedback
 */
export function updateNodeFocus(
    targetFocusedNodeId: string | null, 
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null,
    focusableNodes: SankeyNode[],
    onfocusChange?: (event: CustomEvent<{ index: number }>) => void
): number {
    if (!svg) return -1;
    
    // Clear all focus classes
    svg.select('.node-group').selectAll('.node > .node-html').classed('focused', false);
    
    if (targetFocusedNodeId) {
        const focusedIndex = focusableNodes.findIndex(node => node.id === targetFocusedNodeId);
        svg.select('.node-group').selectAll(`.node > .node-html[data-node-id="${targetFocusedNodeId}"]`).classed('focused', true);
        onfocusChange?.(new CustomEvent('focusChange', { detail: { index: focusedIndex }}));
        return focusedIndex;
    }
    
    return -1;
}

/**
 * Focus next node in the focusable list
 */
export function focusNextNode(
    focusableNodes: SankeyNode[],
    currentFocusedIndex: number,
    onfocusChange?: (event: CustomEvent<{ index: number }>) => void
): number {
    if (focusableNodes.length === 0) return -1;
    
    const nextIndex = (currentFocusedIndex + 1) % focusableNodes.length;
    onfocusChange?.(new CustomEvent('focusChange', { detail: { index: nextIndex }}));
    return nextIndex;
}

/**
 * Focus previous node in the focusable list
 */
export function focusPreviousNode(
    focusableNodes: SankeyNode[],
    currentFocusedIndex: number,
    onfocusChange?: (event: CustomEvent<{ index: number }>) => void
): number {
    if (focusableNodes.length === 0) return -1;
    
    const prevIndex = currentFocusedIndex <= 0 ? focusableNodes.length - 1 : currentFocusedIndex - 1;
    onfocusChange?.(new CustomEvent('focusChange', { detail: { index: prevIndex }}));
    return prevIndex;
}

/**
 * Select the currently focused node
 */
export function selectFocusedNode(
    focusableNodes: SankeyNode[],
    currentFocusedIndex: number,
    onnodeSelect?: (event: any) => void
): void {
    if (currentFocusedIndex >= 0 && currentFocusedIndex < focusableNodes.length) {
        const focusedNode = focusableNodes[currentFocusedIndex];
        
        // Use session viewer store to select the focused node
        viewerStoreModule.sessionViewerActions.selectItem('node', focusedNode.id, focusedNode.data || focusedNode);
        
        // Also emit the event for backwards compatibility
        onnodeSelect?.(new CustomEvent('nodeSelect', {
            detail: {
                nodeId: focusedNode.id,
                node: focusedNode,
                event: new KeyboardEvent('keydown', { key: 'Enter' })
            }
        }));
    }
}

/**
 * Check if a link should be active in focus mode
 */
export function isLinkActiveInFocusMode(
    link: any, 
    activePath: any
): boolean {
    if (!activePath?.links?.length) return true; // No focus mode, all links are active
    
    const activeNodeId = activePath.nodeId;
    const connectedLinks = getConnectedLinkIds(activeNodeId, activePath);
    const linkId = `${typeof link.source === 'object' ? link.source.id : link.source}-${typeof link.target === 'object' ? link.target.id : link.target}`;
    
    return connectedLinks.has(linkId);
}

/**
 * Get connected link IDs for a given node
 */
export function getConnectedLinkIds(nodeId: string, sankeyData?: any): Set<string> {
    if (!sankeyData?.links) return new Set();
    
    const connectedLinkIds = new Set<string>();
    
    sankeyData.links.forEach((link: any) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === nodeId || targetId === nodeId) {
            connectedLinkIds.add(`${sourceId}-${targetId}`);
        }
    });
    
    return connectedLinkIds;
}

/**
 * Apply focus highlighting to connected nodes and links
 */
export function applyFocusHighlighting(
    focusedNodeId: string,
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null,
    sankeyData: any
): void {
    if (!svg || !sankeyData) return;
    
    const connectedNodeIds = new Set<string>();
    const connectedLinkIds = new Set<string>();
    
    connectedNodeIds.add(focusedNodeId);
    
    // Build maps for efficient lookup
    const nodeMap = new Map<string, any>();
    const forwardMap = new Map<string, Set<string>>(); // source -> targets
    const backwardMap = new Map<string, Set<string>>(); // target -> sources
    
    sankeyData.nodes?.forEach((node: any) => {
        nodeMap.set(node.id, node);
    });
    
    sankeyData.links?.forEach((link: any) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (!forwardMap.has(sourceId)) forwardMap.set(sourceId, new Set());
        if (!backwardMap.has(targetId)) backwardMap.set(targetId, new Set());
        
        forwardMap.get(sourceId)!.add(targetId);
        backwardMap.get(targetId)!.add(sourceId);
    });
    
    const findForward = (nodeId: string, allowedTypes: string[]) => {
        const targets = forwardMap.get(nodeId) || new Set();
        targets.forEach(targetId => {
            const targetNode = nodeMap.get(targetId);
            if (targetNode && allowedTypes.includes(targetNode.type)) {
                connectedNodeIds.add(targetId);
                connectedLinkIds.add(`${nodeId}-${targetId}`);
                
                // Continue forward if we found a diagnosis and need treatments
                if (targetNode.type === 'diagnosis') {
                    const treatmentTargets = forwardMap.get(targetId) || new Set();
                    treatmentTargets.forEach(treatmentId => {
                        const treatmentNode = nodeMap.get(treatmentId);
                        if (treatmentNode && treatmentNode.type === 'treatment') {
                            connectedNodeIds.add(treatmentId);
                            connectedLinkIds.add(`${targetId}-${treatmentId}`);
                        }
                    });
                }
            }
        });
    };
    
    const findBackward = (nodeId: string, allowedTypes: string[]) => {
        const sources = backwardMap.get(nodeId) || new Set();
        sources.forEach(sourceId => {
            const sourceNode = nodeMap.get(sourceId);
            if (sourceNode && allowedTypes.includes(sourceNode.type)) {
                connectedNodeIds.add(sourceId);
                connectedLinkIds.add(`${sourceId}-${nodeId}`);
                
                // Continue backward if we found a diagnosis and need symptoms
                if (sourceNode.type === 'diagnosis') {
                    const symptomSources = backwardMap.get(sourceId) || new Set();
                    symptomSources.forEach(symptomId => {
                        const symptomNode = nodeMap.get(symptomId);
                        if (symptomNode && symptomNode.type === 'symptom') {
                            connectedNodeIds.add(symptomId);
                            connectedLinkIds.add(`${symptomId}-${sourceId}`);
                        }
                    });
                }
            }
        });
    };
    
    const focusedNode = nodeMap.get(focusedNodeId);
    if (!focusedNode) return;
    
    // Apply directional logic based on node type
    switch (focusedNode.type) {
        case 'symptom':
            findForward(focusedNodeId, ['diagnosis', 'treatment']);
            break;
            
        case 'diagnosis':
            findBackward(focusedNodeId, ['symptom']);
            findForward(focusedNodeId, ['treatment']);
            break;
            
        case 'treatment':
            findBackward(focusedNodeId, ['diagnosis']);
            
            // Also find symptoms connected to those diagnoses
            connectedNodeIds.forEach(diagId => {
                if (diagId !== focusedNodeId) {
                    const diagNode = nodeMap.get(diagId);
                    if (diagNode && diagNode.type === 'diagnosis') {
                        findBackward(diagId, ['symptom']);
                    }
                }
            });
            break;
    }
    
    // Apply highlighting classes
    svg.selectAll('.node-html')
        .classed('active-path', (d: any) => connectedNodeIds.has(d.id))
        .classed('background-path', (d: any) => !connectedNodeIds.has(d.id));
    
    svg.selectAll('.link')
        .classed('active-path', (d: any) => {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            return connectedLinkIds.has(`${sourceId}-${targetId}`);
        })
        .classed('background-path', (d: any) => {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            return !connectedLinkIds.has(`${sourceId}-${targetId}`);
        });
}

/**
 * Reset all highlighting and focus states
 */
export function resetHighlighting(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null
): void {
    if (!svg) return;
    
    // Get all unique class names used by the sankey diagram 
    const classNames = ['hovered', 'selected', 'background-path', 'active-path', 'inactive', 'focused'];
    
    // Remove classes from all elements
    classNames.forEach(className => {
        svg.selectAll(`.node-html.${className}, .link.${className}`)
            .classed(className, false);
    });
    
    // Apply default state classes with transition for smooth animation
    svg.selectAll('.node-html, .link')
        .classed(`state-reset`, true);
}

/**
 * Update selection state based on active and hover paths
 */
export function updateSelectionState(
    activePath: any, 
    hoverPath: any,
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null,
    isMobile: boolean,
    selectedNodeId: string | null = null
): void {
    if (!svg) return;
    
    const activeNodes = activePath?.nodes || [];
    const activeLinks = activePath?.links || [];
    const hoverNodes = hoverPath?.nodes || [];
    const hoverLinks = hoverPath?.links || [];
    
    // Create sets for efficient lookup
    const highlightedNodeSet = hoverNodes.length > 0 ? new Set(hoverNodes) : new Set(activeNodes);
    const highlightedLinkSet = hoverLinks.length > 0 ? new Set(hoverLinks) : new Set(activeLinks);
    
    
    const hasHighlighted = highlightedNodeSet.size > 0;
    const renderModeClass = isMobile ? 'render-mobile' : 'render-desktop';
    
    // Update node states - be specific about direct children only
    const nodeHtmlSelection = svg.select('.node-group').selectAll('.node > .node-html');
    
    nodeHtmlSelection
        .classed('highlighted', (d: any) => highlightedNodeSet.has(d.id))
        .classed('dimmed', (d: any) => hasHighlighted && !highlightedNodeSet.has(d.id))
        .classed('background-trigger', (d: any) => hasHighlighted && !highlightedNodeSet.has(d.id))
        .classed(`state-active ${renderModeClass}`, hasHighlighted)
        .classed('state-default', !hasHighlighted);
    
    // Handle selected class separately and only for foreignObject elements
    nodeHtmlSelection.classed('selected', false); // Clear all first
    if (selectedNodeId) {
        nodeHtmlSelection
            .filter((d: any) => d.id === selectedNodeId)
            .classed('selected', true);
    }
    
    nodeHtmlSelection.each(function(d: any) {
            // Add type-specific classes for enhanced styling
            d3.select(this)
                .classed(`node-${d.type}`, true)
                .classed('has-priority', d.priority !== undefined)
                .classed(`priority-${d.priority}`, d.priority !== undefined);
        });
    
    // Update link states
    svg.selectAll('.link')
        .classed('highlighted', (d: any) => {
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            const linkId = `${sourceId}-${targetId}`;
            return highlightedLinkSet.has(linkId);
        })
        .classed('dimmed', (d: any) => {
            if (!hasHighlighted) return false;
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            const linkId = `${sourceId}-${targetId}`;
            return !highlightedLinkSet.has(linkId);
        })
        .classed('background-trigger', (d: any) => {
            if (!hasHighlighted) return false;
            const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
            const targetId = typeof d.target === 'object' ? d.target.id : d.target;
            const linkId = `${sourceId}-${targetId}`;
            return !highlightedLinkSet.has(linkId);
        })
        .classed(`state-active ${renderModeClass}`, hasHighlighted)
        .classed('state-default', !hasHighlighted);
}

/**
 * Reset to default state (clear all selections and highlights)
 */
export function resetToDefault(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null
): void {
    if (!svg) return;
    
    // Clear viewer store selections
    viewerStoreModule.sessionViewerActions.clearSelection();
    
    // Reset all visual states
    svg.select('.node-group').selectAll('.node > .node-html')
        .classed('highlighted dimmed background-trigger background-path active-path selected focused hovered connected-to-selected', false)
        .classed('state-default', true);
    
    svg.selectAll('.link')
        .classed('active-path background-trigger background-path inactive hovered connected-to-selected', false);
}