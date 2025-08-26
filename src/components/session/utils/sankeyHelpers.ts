/**
 * Sankey Diagram Helper Functions
 * Utility functions for text processing, styling, and other helpers
 */

import type { SankeyNode } from '../types/visualization';

/**
 * Truncate text to fit within specified length
 */
export function truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

/**
 * Calculate link strength class based on width
 */
export function getLinkStrengthClass(width: number): string {
    if (width >= 25) return 'strength-maximum';
    if (width >= 12) return 'strength-very-strong';
    if (width >= 8) return 'strength-strong';
    if (width >= 4) return 'strength-moderate';
    if (width >= 2) return 'strength-weak';
    return 'strength-minimal';
}

/**
 * Create HTML content for node based on its type and data
 */
export function createNodeComponent(node: SankeyNode): string {
    const commonClasses = `session-node session-node-base ${node.type}`;
    const sourceClass = node.data?.source ? `session-source-${node.data.source}` : '';
    const fullClasses = `${commonClasses} ${sourceClass}`.trim();
    
    switch (node.type) {
        case 'symptom':
            return createSymptomNodeHTML(node, fullClasses);
        case 'diagnosis':
            return createDiagnosisNodeHTML(node, fullClasses);
        case 'treatment':
            return createTreatmentNodeHTML(node, fullClasses);
        default:
            return createGenericNodeHTML(node, fullClasses);
    }
}

function createSymptomNodeHTML(node: SankeyNode, classes: string): string {
    const data = node.data as any;
    const severity = data?.severity || 5;
    const severityBadge = `<span class="session-severity-badge severity-${severity}">${severity}</span>`;
    
    return `
        <div class="${classes}" data-node-id="${node.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
                <div style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); flex: 1; line-height: 1.2;">
                    ${truncateText(data?.text || node.id, 60)}
                </div>
                ${severityBadge}
            </div>
            ${data?.characteristics ? `
                <div style="font-size: 0.75rem; color: var(--color-text-secondary); font-style: italic;">
                    ${data.characteristics.join(', ')}
                </div>
            ` : ''}
            ${data?.duration ? `
                <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.25rem;">
                    Duration: ${data.duration} days
                </div>
            ` : ''}
        </div>
    `;
}

function createDiagnosisNodeHTML(node: SankeyNode, classes: string): string {
    const data = node.data as any;
    const probability = data?.probability ? Math.round(data.probability * 100) : 50;
    const priority = data?.priority || 5;
    
    const probabilityClass = probability >= 80 ? 'value-high' : 
                           probability >= 60 ? 'value-medium' : 
                           probability >= 40 ? 'value-low' : 'value-very-low';
    
    const priorityClass = priority <= 2 ? 'priority-critical' :
                         priority <= 4 ? 'priority-high' :
                         priority <= 6 ? 'priority-medium' : 'priority-low';
    
    return `
        <div class="${classes} ${priorityClass}" data-node-id="${node.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
                <div style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); flex: 1; line-height: 1.2;">
                    ${truncateText(data?.name || node.id, 60)}
                </div>
                <span class="session-probability-badge session-badge ${probabilityClass}">${probability}%</span>
            </div>
            ${data?.icd10 ? `
                <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">
                    <span class="session-info-badge icd10">${data.icd10}</span>
                </div>
            ` : ''}
            ${data?.requiresInvestigation ? `
                <div style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--color-warning); margin-top: 0.25rem;">
                    <span class="session-investigation-flag">!</span>
                    Requires investigation
                </div>
            ` : ''}
        </div>
    `;
}

function createTreatmentNodeHTML(node: SankeyNode, classes: string): string {
    const data = node.data as any;
    const effectiveness = data?.effectiveness ? Math.round(data.effectiveness * 100) : 70;
    const urgency = data?.urgency || 'routine';
    
    const effectivenessClass = effectiveness >= 80 ? 'value-high' : 
                              effectiveness >= 60 ? 'value-medium' : 
                              effectiveness >= 40 ? 'value-low' : 'value-very-low';
    
    const treatmentTypeClass = data?.type ? `treatment-type-${data.type}` : '';
    const urgencyClass = `urgency-${urgency}`;
    
    return `
        <div class="${classes} ${treatmentTypeClass} ${urgencyClass}" data-node-id="${node.id}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.25rem;">
                <div style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); flex: 1; line-height: 1.2;">
                    ${truncateText(data?.name || node.id, 60)}
                </div>
                <span class="session-effectiveness-badge session-badge ${effectivenessClass}">${effectiveness}%</span>
            </div>
            ${data?.type ? `
                <div style="margin-bottom: 0.25rem;">
                    <span class="treatment-type-label">${data.type.replace('_', ' ')}</span>
                </div>
            ` : ''}
            ${data?.dosage ? `
                <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">
                    <span class="session-info-badge dosage">${data.dosage}</span>
                </div>
            ` : ''}
            ${data?.duration ? `
                <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 0.25rem;">
                    <span class="session-info-badge duration">${data.duration}</span>
                </div>
            ` : ''}
            ${data?.urgency && urgency !== 'routine' ? `
                <div style="font-size: 0.75rem; font-weight: 600; color: var(--color-error); margin-top: 0.25rem; text-transform: uppercase;">
                    ${urgency}
                </div>
            ` : ''}
        </div>
    `;
}

function createGenericNodeHTML(node: SankeyNode, classes: string): string {
    return `
        <div class="${classes}" data-node-id="${node.id}">
            <div style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary);">
                ${truncateText(node.id, 60)}
            </div>
        </div>
    `;
}

/**
 * Calculate column positions for button placement
 */
export function calculateColumnPositions(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>): {
    symptomColumn: { centerX: number; bottomY: number } | null;
    diagnosisColumn: { centerX: number; bottomY: number } | null;
    treatmentColumn: { centerX: number; bottomY: number } | null;
} {
    if (!svg) {
        return { symptomColumn: null, diagnosisColumn: null, treatmentColumn: null };
    }

    const allNodes = svg.selectAll('.node').data();
    
    if (!allNodes || allNodes.length === 0) {
        return { symptomColumn: null, diagnosisColumn: null, treatmentColumn: null };
    }

    const symptomNodes = allNodes.filter((n: any) => n.type === 'symptom');
    const diagnosisNodes = allNodes.filter((n: any) => n.type === 'diagnosis');
    const treatmentNodes = allNodes.filter((n: any) => n.type === 'treatment');

    const calculateColumnInfo = (nodes: any[]) => {
        if (!nodes.length) return null;
        
        const positions = nodes.map(n => ({
            x: (n.x0 + n.x1) / 2, // Center X of node
            bottom: n.y1 // Bottom Y of node
        }));
        
        return {
            centerX: positions.reduce((sum, p) => sum + p.x, 0) / positions.length,
            bottomY: Math.max(...positions.map(p => p.bottom))
        };
    };

    return {
        symptomColumn: calculateColumnInfo(symptomNodes),
        diagnosisColumn: calculateColumnInfo(diagnosisNodes), 
        treatmentColumn: calculateColumnInfo(treatmentNodes)
    };
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
}

/**
 * Throttle function for scroll/resize events
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func.apply(null, args);
        }
    };
}