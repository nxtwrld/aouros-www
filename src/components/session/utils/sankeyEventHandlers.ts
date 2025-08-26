/**
 * Sankey Diagram Event Handlers
 * Centralized event handling logic for the Sankey diagram
 */

import type { SankeyNode, SankeyLink } from '../types/visualization';

export interface EventHandlers {
    onNodeClick?: (event: MouseEvent | TouchEvent, node: SankeyNode) => void;
    onNodeHover?: (nodeId: string, isEntering: boolean) => void;
    onLinkClick?: (event: MouseEvent | TouchEvent, link: SankeyLink) => void;
    onLinkHover?: (link: any, isEntering: boolean) => void;
    onCanvasClick?: (event: MouseEvent) => void;
}

/**
 * Create a debounced hover handler to prevent excessive updates
 */
export function createDebouncedHover(
    callback: (id: string, isEntering: boolean) => void,
    delay: number = 100
) {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return (id: string, isEntering: boolean) => {
        if (timeoutId) clearTimeout(timeoutId);
        
        if (isEntering) {
            // Immediate hover enter
            callback(id, true);
        } else {
            // Debounced hover exit
            timeoutId = setTimeout(() => {
                callback(id, false);
            }, delay);
        }
    };
}

/**
 * Handle keyboard navigation for accessibility
 */
export class KeyboardNavigationHandler {
    private focusableNodes: SankeyNode[] = [];
    private focusedIndex: number = -1;
    private onFocusChange?: (nodeId: string | null, index: number) => void;
    private onNodeSelect?: (node: SankeyNode) => void;
    
    constructor(options: {
        onFocusChange?: (nodeId: string | null, index: number) => void;
        onNodeSelect?: (node: SankeyNode) => void;
    }) {
        this.onFocusChange = options.onFocusChange;
        this.onNodeSelect = options.onNodeSelect;
    }
    
    updateFocusableNodes(nodes: SankeyNode[]) {
        // Order nodes by medical workflow: symptoms -> diagnoses -> treatments
        this.focusableNodes = [
            ...nodes.filter(n => n.type === 'symptom'),
            ...nodes.filter(n => n.type === 'diagnosis'),
            ...nodes.filter(n => n.type === 'treatment'),
            ...nodes.filter(n => !['symptom', 'diagnosis', 'treatment'].includes(n.type))
        ];
    }
    
    focusNext() {
        if (this.focusableNodes.length === 0) return;
        
        this.focusedIndex = (this.focusedIndex + 1) % this.focusableNodes.length;
        const node = this.focusableNodes[this.focusedIndex];
        this.onFocusChange?.(node.id, this.focusedIndex);
    }
    
    focusPrevious() {
        if (this.focusableNodes.length === 0) return;
        
        this.focusedIndex = this.focusedIndex <= 0 
            ? this.focusableNodes.length - 1 
            : this.focusedIndex - 1;
        
        const node = this.focusableNodes[this.focusedIndex];
        this.onFocusChange?.(node.id, this.focusedIndex);
    }
    
    selectFocused() {
        if (this.focusedIndex >= 0 && this.focusedIndex < this.focusableNodes.length) {
            const node = this.focusableNodes[this.focusedIndex];
            this.onNodeSelect?.(node);
        }
    }
    
    clearFocus() {
        this.focusedIndex = -1;
        this.onFocusChange?.(null, -1);
    }
    
    getFocusedNode(): SankeyNode | null {
        if (this.focusedIndex >= 0 && this.focusedIndex < this.focusableNodes.length) {
            return this.focusableNodes[this.focusedIndex];
        }
        return null;
    }
}

/**
 * Path calculation for medical reasoning visualization
 */
export function calculateMedicalPath(
    nodeId: string,
    nodeType: string,
    nodeMap: Map<string, any>,
    forwardMap: Map<string, Set<string>>,
    backwardMap: Map<string, Set<string>>
): { nodes: Set<string>; links: Set<string> } {
    const connectedNodeIds = new Set<string>();
    const connectedLinkIds = new Set<string>();
    
    connectedNodeIds.add(nodeId);
    
    // Helper function to find forward connections
    const findForward = (sourceId: string, allowedTypes: string[]) => {
        const targets = forwardMap.get(sourceId) || new Set();
        targets.forEach(targetId => {
            const targetNode = nodeMap.get(targetId);
            if (targetNode && allowedTypes.includes(targetNode.type)) {
                connectedNodeIds.add(targetId);
                connectedLinkIds.add(`${sourceId}-${targetId}`);
                
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
    
    // Helper function to find backward connections
    const findBackward = (targetId: string, allowedTypes: string[]) => {
        const sources = backwardMap.get(targetId) || new Set();
        sources.forEach(sourceId => {
            const sourceNode = nodeMap.get(sourceId);
            if (sourceNode && allowedTypes.includes(sourceNode.type)) {
                connectedNodeIds.add(sourceId);
                connectedLinkIds.add(`${sourceId}-${targetId}`);
                
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
    
    // Apply directional logic based on node type
    switch (nodeType) {
        case 'symptom':
            // Symptom -> Diagnoses -> Treatments
            findForward(nodeId, ['diagnosis', 'treatment']);
            break;
            
        case 'diagnosis':
            // Symptoms -> Diagnosis -> Treatments
            findBackward(nodeId, ['symptom']);
            findForward(nodeId, ['treatment']);
            break;
            
        case 'treatment':
            // Find diagnoses that lead to or are investigated by this treatment
            findBackward(nodeId, ['diagnosis']);
            
            // Also find symptoms connected to those diagnoses
            connectedNodeIds.forEach(diagId => {
                if (diagId !== nodeId) {
                    const diagNode = nodeMap.get(diagId);
                    if (diagNode && diagNode.type === 'diagnosis') {
                        findBackward(diagId, ['symptom']);
                    }
                }
            });
            break;
    }
    
    return { nodes: connectedNodeIds, links: connectedLinkIds };
}