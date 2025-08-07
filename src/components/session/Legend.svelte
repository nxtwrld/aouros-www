<script lang="ts">
    import { COLORS } from './config/visual-config';

    export let detailed: boolean = false;

    const nodeTypes = [
        { type: 'symptom', color: COLORS.LEGEND.SYMPTOM, label: 'Symptoms' },
        { type: 'diagnosis', color: COLORS.LEGEND.DIAGNOSIS, label: 'Diagnoses' },
        { type: 'treatment', color: COLORS.LEGEND.TREATMENT, label: 'Treatments' },
        { type: 'question', color: COLORS.LEGEND.QUESTION, label: 'Questions' },
        { type: 'alert', color: COLORS.LEGEND.ALERT, label: 'Safety Alerts' }
    ];

    const sources = [
        { source: 'transcript', color: COLORS.SOURCES.TRANSCRIPT, label: 'Current Conversation' },
        { source: 'medical_history', color: COLORS.SOURCES.MEDICAL_HISTORY, label: 'Medical History' },
        { source: 'family_history', color: COLORS.SOURCES.FAMILY_HISTORY, label: 'Family History' },
        { source: 'social_history', color: COLORS.SOURCES.SOCIAL_HISTORY, label: 'Social History' },
        { source: 'medication_history', color: COLORS.SOURCES.MEDICATION_HISTORY, label: 'Medication History' },
        { source: 'suspected', color: COLORS.SOURCES.SUSPECTED, label: 'AI Suspected' }
    ];

    const relationships = [
        { type: 'supports', color: COLORS.RELATIONSHIPS.SUPPORTS, label: 'Supports' },
        { type: 'confirms', color: COLORS.RELATIONSHIPS.CONFIRMS, label: 'Confirms' },
        { type: 'suggests', color: COLORS.RELATIONSHIPS.SUGGESTS, label: 'Suggests' },
        { type: 'indicates', color: COLORS.RELATIONSHIPS.INDICATES, label: 'Indicates' },
        { type: 'contradicts', color: COLORS.RELATIONSHIPS.CONTRADICTS, label: 'Contradicts' },
        { type: 'rules_out', color: COLORS.RELATIONSHIPS.RULES_OUT, label: 'Rules Out' },
        { type: 'treats', color: COLORS.RELATIONSHIPS.TREATS, label: 'Treats' },
        { type: 'manages', color: COLORS.RELATIONSHIPS.MANAGES, label: 'Manages' },
        { type: 'requires', color: COLORS.RELATIONSHIPS.REQUIRES, label: 'Requires' },
        { type: 'investigates', color: COLORS.RELATIONSHIPS.INVESTIGATES, label: 'Investigates' },
        { type: 'clarifies', color: COLORS.RELATIONSHIPS.CLARIFIES, label: 'Clarifies' },
        { type: 'explores', color: COLORS.RELATIONSHIPS.EXPLORES, label: 'Explores' }
    ];

    const priorities = [
        { range: '1-2', color: COLORS.PRIORITY.HIGH, label: 'Critical' },
        { range: '3-4', color: COLORS.PRIORITY.MEDIUM, label: 'High' },
        { range: '5-6', color: COLORS.UI.INFO, label: 'Medium' },
        { range: '7-10', color: COLORS.PRIORITY.LOW, label: 'Low' }
    ];
</script>

<div class="legend" class:detailed>
    <h4>Legend</h4>
    
    <div class="legend-section">
        <h5>Node Types</h5>
        <div class="legend-items">
            {#each nodeTypes as item}
                <div class="legend-item">
                    <div 
                        class="color-indicator node-indicator"
                        style="background-color: {item.color}"
                    ></div>
                    <span class="label">{item.label}</span>
                </div>
            {/each}
        </div>
    </div>

    {#if detailed}
        <div class="legend-section">
            <h5>Symptom Sources</h5>
            <div class="legend-items">
                {#each sources as item}
                    <div class="legend-item">
                        <div 
                            class="color-indicator source-indicator"
                            style="background-color: {item.color}"
                        ></div>
                        <span class="label">{item.label}</span>
                    </div>
                {/each}
            </div>
        </div>

        <div class="legend-section">
            <h5>Relationships</h5>
            <div class="legend-items">
                {#each relationships as item}
                    <div class="legend-item">
                        <div 
                            class="color-indicator line-indicator"
                            style="background-color: {item.color}"
                        ></div>
                        <span class="label">{item.label}</span>
                    </div>
                {/each}
            </div>
        </div>

        <div class="legend-section">
            <h5>Priority Levels</h5>
            <div class="legend-items">
                {#each priorities as item}
                    <div class="legend-item">
                        <div 
                            class="color-indicator priority-indicator"
                            style="background-color: {item.color}"
                        ></div>
                        <span class="label">{item.label} ({item.range})</span>
                    </div>
                {/each}
            </div>
        </div>

        <div class="legend-section">
            <h5>Interaction Guide</h5>
            <div class="interaction-guide">
                <div class="guide-item">
                    <span class="action">Click</span>
                    <span class="description">Select node for details</span>
                </div>
                <div class="guide-item">
                    <span class="action">Hover</span>
                    <span class="description">Preview relationships</span>
                </div>
                <div class="guide-item">
                    <span class="action">Pinch</span>
                    <span class="description">Zoom in/out (mobile)</span>
                </div>
            </div>
        </div>
    {:else}
        <div class="compact-info">
            <p class="info-text">
                Click nodes for details • Hover to see relationships
            </p>
        </div>
    {/if}
</div>

<style>
    .legend {
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 8px;
        padding: 1rem;
        font-size: 0.875rem;
        backdrop-filter: blur(4px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        max-width: 280px;
    }

    .legend.detailed {
        max-width: none;
        width: 100%;
    }

    .legend h4 {
        margin: 0 0 1rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text-primary, #1f2937);
        border-bottom: 1px solid var(--color-border, #e2e8f0);
        padding-bottom: 0.5rem;
    }

    .legend-section {
        margin-bottom: 1.25rem;
    }

    .legend-section:last-child {
        margin-bottom: 0;
    }

    .legend-section h5 {
        margin: 0 0 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-text-primary, #1f2937);
    }

    .legend-items {
        display: grid;
        gap: 0.375rem;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .color-indicator {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        flex-shrink: 0;
    }

    .node-indicator {
        border-radius: 3px;
        border: 1px solid rgba(0,0,0,0.1);
    }

    .source-indicator {
        width: 4px;
        height: 16px;
        border-radius: 2px;
    }

    .line-indicator {
        height: 3px;
        width: 20px;
        border-radius: 1px;
    }

    .priority-indicator {
        border-radius: 50%;
        width: 10px;
        height: 10px;
    }

    .label {
        color: var(--color-text-primary, #1f2937);
        font-size: 0.875rem;
    }

    .compact-info {
        margin-top: 0.75rem;
    }

    .info-text {
        margin: 0;
        color: var(--color-text-secondary, #6b7280);
        font-size: 0.75rem;
        line-height: 1.4;
    }

    .interaction-guide {
        display: grid;
        gap: 0.375rem;
    }

    .guide-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .action {
        font-weight: 600;
        color: var(--color-primary, #3b82f6);
        font-size: 0.75rem;
    }

    .description {
        color: var(--color-text-secondary, #6b7280);
        font-size: 0.75rem;
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
        .legend {
            font-size: 0.8rem;
            padding: 0.75rem;
        }

        .legend h4 {
            font-size: 0.9rem;
        }

        .legend-section h5 {
            font-size: 0.8rem;
        }

        .label,
        .action,
        .description {
            font-size: 0.75rem;
        }

        .color-indicator {
            width: 10px;
            height: 10px;
        }

        .source-indicator {
            width: 3px;
            height: 14px;
        }

        .line-indicator {
            width: 16px;
            height: 2px;
        }
    }
</style>