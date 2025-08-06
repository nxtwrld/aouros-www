<script lang="ts">
    export let detailed: boolean = false;

    const nodeTypes = [
        { type: 'symptom', color: 'hsla(120, 60%, 60%, 0.8)', label: 'Symptoms' },
        { type: 'diagnosis', color: 'hsla(220, 70%, 60%, 0.8)', label: 'Diagnoses' },
        { type: 'treatment', color: 'hsla(160, 70%, 60%, 0.8)', label: 'Treatments' },
        { type: 'question', color: 'hsla(40, 80%, 60%, 0.8)', label: 'Questions' },
        { type: 'alert', color: 'hsla(0, 80%, 60%, 0.8)', label: 'Safety Alerts' }
    ];

    const sources = [
        { source: 'transcript', color: '#10b981', label: 'Current Conversation' },
        { source: 'medical_history', color: '#3b82f6', label: 'Medical History' },
        { source: 'family_history', color: '#8b5cf6', label: 'Family History' },
        { source: 'social_history', color: '#f59e0b', label: 'Social History' },
        { source: 'medication_history', color: '#06b6d4', label: 'Medication History' },
        { source: 'suspected', color: '#f97316', label: 'AI Suspected' }
    ];

    const relationships = [
        { type: 'supports', color: '#4ade80', label: 'Supports' },
        { type: 'contradicts', color: '#f87171', label: 'Contradicts' },
        { type: 'treats', color: '#60a5fa', label: 'Treats' },
        { type: 'investigates', color: '#a78bfa', label: 'Investigates' },
        { type: 'confirms', color: '#34d399', label: 'Confirms' }
    ];

    const priorities = [
        { range: '1-2', color: '#dc2626', label: 'Critical' },
        { range: '3-4', color: '#f59e0b', label: 'High' },
        { range: '5-6', color: '#3b82f6', label: 'Medium' },
        { range: '7-10', color: '#10b981', label: 'Low' }
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