<script lang="ts">
    import type { SymptomNode as SymptomData, SankeyNode } from '../types/visualization';
    import { getSourceColor, getPriorityColor } from '../config/visual-config';
    
    interface Props {
        node: SankeyNode;
        symptom: SymptomData;
        isSelected: boolean;
        isMobile: boolean;
    }
    
    let { node, symptom, isSelected, isMobile }: Props = $props();
    
    function truncateText(text: string, maxLength: number): string {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    function getPriorityColorLocal(priority: number): string {
        if (priority <= 2) return '#dc2626'; // Red for critical
        if (priority <= 4) return '#ea580c'; // Orange for high  
        if (priority <= 6) return '#3b82f6'; // Blue for medium
        return '#10b981'; // Green for low
    }
    
    function getSourceColorLocal(source: string): string {
        switch (source) {
            case 'transcript': return '#10b981';
            case 'medical_history': return '#3b82f6';
            case 'family_history': return '#8b5cf6'; 
            case 'social_history': return '#f59e0b';
            case 'medication_history': return '#06b6d4';
            case 'suspected': return '#f97316';
            default: return '#6b7280';
        }
    }
    
    function getOpacityForSeverity(severity: number): number {
        if (severity <= 2) return 1.0;   // Critical - full opacity
        if (severity <= 4) return 0.9;   // High - high opacity
        if (severity <= 6) return 0.7;   // Medium - medium opacity
        return 0.5;                      // Low - lower opacity
    }
</script>

<div 
    class="symptom-node source-{symptom.source}" 
    class:selected={isSelected} 
    class:mobile={isMobile}
    style="--color-opacity: {getOpacityForSeverity(symptom.severity)};"
>

<div class="symptom-meta">
    {#if symptom.duration}
        <span class="duration">{symptom.duration}d</span>
    {/if}
    {#if symptom.characteristics && symptom.characteristics.length > 0}
        <!--span class="characteristics-count">{symptom.characteristics.length} traits</span-->
    {/if}
    {#if symptom.confidence}
            <!--div class="confidence-score">{Math.round(symptom.confidence * 100)}%</div-->
        {/if}
    
    <div class="severity-badge severity-{symptom.severity}">S{symptom.severity}</div>
</div>
      
    
    
    <div class="symptom-content">
        <div class="symptom-text">{truncateText(symptom.text, isMobile ? 20 : 45)}</div>
    </div>
</div>

<style>
    .symptom-node {
        position: relative;
        width: 100%;
        height: 100%;
        /*min-height: 3rem;
        border-radius: 6px;*/
        padding: .4rem;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        font-family: system-ui, sans-serif;
        
        /* Color with opacity control */
        --base-color-rgb: 204, 204, 204;  /* #CCC equivalent */
        --color-opacity: 0.8;             /* Default opacity */
        background-color: rgba(var(--base-color-rgb), var(--color-opacity));
        
        border: 0px solid transparent;
        border-left-color: #6b7280;
        border-left-width: .5rem;
    }
    .symptom-node.source-transcript {
        border-color: #10b981
    }
    .symptom-node.source-medical_history {
        border-color: #3b82f6;
    }
    .symptom-node.source-family_history {
        border-color: #8b5cf6;
    }
    .symptom-node.source-social_history {
        border-color: #f59e0b;
    }
    .symptom-node.source-medication_history {
        border-color: #06b6d4;
    }
    .symptom-node.source-suspected {
        border-color: #f97316;
    }
     
    .symptom-node.selected {
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    
  
    
    .severity-badge {

        font-size: 0.65em;
        font-weight: 700;
        color: white;
        background: rgba(220, 38, 38, 0.9);
        padding: 2px 4px;
    }
    
    .severity-badge.severity-1,
    .severity-badge.severity-2 {
        background: rgba(220, 38, 38, 0.9); /* Red for critical */
    }
    
    .severity-badge.severity-3,
    .severity-badge.severity-4 {
        background: rgba(234, 88, 12, 0.9); /* Orange for high */
    }
    
    .severity-badge.severity-5,
    .severity-badge.severity-6 {
        background: rgba(59, 130, 246, 0.9); /* Blue for medium */
    }
    
    .severity-badge.severity-7,
    .severity-badge.severity-8,
    .severity-badge.severity-9,
    .severity-badge.severity-10 {
        background: rgba(16, 185, 129, 0.9); /* Green for low */
    }
    

    .confidence-score {
        color: #1f2937;
        font-size: 0.7em;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.9);
        padding: 1px 4px;
        border-radius: 3px;
        line-height: 1;
        text-shadow: none;
    }
    
    .symptom-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        text-align: center;
        gap: 2px;
        margin-top: .2rem;
    }
    
    .symptom-text {
        font-weight: 600;
        color: #1f2937;
        line-height: 1.2;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
    }
    
    .symptom-meta {
        position: absolute;
        right: 0;
        top: 0;
        display: flex;
        justify-content: right;
        gap: var(--gap);
    }
    
    .duration,
    .characteristics-count {
        font-size: 0.65em;
        color: #4b5563;
        font-weight: 500;
        background: rgba(255, 255, 255, 0.7);
        padding: 1px 3px;
        line-height: 1;
    }
    
    .characteristics-count {
        background: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
        border: 1px solid rgba(59, 130, 246, 0.2);
    }
    
    /* Mobile responsive adjustments */
    .symptom-node.mobile {
        padding: 4px;
    }
    
    .symptom-node.mobile .symptom-text {
        font-size: 9px;
    }
    
    .symptom-node.mobile .confidence-score {
        font-size: 0.6em;
    }
    
    .symptom-node.mobile .severity-badge {
        font-size: 7px;
        padding: 1px 3px;
    }
    
    .symptom-node.mobile .duration,
    .symptom-node.mobile .characteristics-count {
        font-size: 0.55em;
    }
    
    /* Desktop styling */
    .symptom-node:not(.mobile) .symptom-text {
        font-size: 11px;
    }
    
    .symptom-node:not(.mobile) .confidence-score {
        font-size: 0.75em;
    }
    
</style>