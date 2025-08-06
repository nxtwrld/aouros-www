<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import type { SymptomNode, DiagnosisNode, TreatmentNode, ActionNode } from './types/visualization';

    export let node: SymptomNode | DiagnosisNode | TreatmentNode | ActionNode;
    export let allNodes: any;

    const dispatch = createEventDispatcher();

    function handleNodeAction(action: string) {
        dispatch('nodeAction', {
            action,
            targetId: node.id,
            reason: `${action} from node details`
        });
    }

    function getNodeTypeLabel(node: any): string {
        if ('severity' in node) return 'Symptom';
        if ('probability' in node) return 'Diagnosis';
        if ('type' in node && ['medication', 'procedure', 'therapy'].includes(node.type)) return 'Treatment';
        if ('actionType' in node) return node.actionType === 'question' ? 'Question' : 'Alert';
        return 'Unknown';
    }

    function getPriorityLabel(priority: number): string {
        if (priority <= 2) return 'Critical';
        if (priority <= 4) return 'High';
        if (priority <= 6) return 'Medium';
        return 'Low';
    }

    function getPriorityColor(priority: number): string {
        if (priority <= 2) return 'var(--color-error, #dc2626)';
        if (priority <= 4) return 'var(--color-warning, #f59e0b)';
        if (priority <= 6) return 'var(--color-info, #3b82f6)';
        return 'var(--color-success, #10b981)';
    }
</script>

<div class="node-details">
    <header class="details-header">
        <div class="node-type">
            <span class="type-label">{getNodeTypeLabel(node)}</span>
            <span 
                class="priority-badge"
                style="background-color: {getPriorityColor(node.priority || 5)}"
            >
                {getPriorityLabel(node.priority || 5)}
            </span>
        </div>
        <h3 class="node-title">
            {'text' in node ? node.text : 'name' in node ? node.name : 'Unknown'}
        </h3>
    </header>

    <div class="details-content">
        <!-- Basic Information -->
        <section class="info-section">
            <h4>Information</h4>
            <div class="info-grid">
                <div class="info-item">
                    <label>ID:</label>
                    <span class="value">{node.id}</span>
                </div>
                <div class="info-item">
                    <label>Priority:</label>
                    <span class="value">{node.priority || 5}/10</span>
                </div>
                {#if 'confidence' in node && node.confidence}
                    <div class="info-item">
                        <label>Confidence:</label>
                        <span class="value">{Math.round(node.confidence * 100)}%</span>
                    </div>
                {/if}
                {#if 'probability' in node && node.probability}
                    <div class="info-item">
                        <label>Probability:</label>
                        <span class="value">{Math.round(node.probability * 100)}%</span>
                    </div>
                {/if}
            </div>
        </section>

        <!-- Symptom specific -->
        {#if 'severity' in node}
            <section class="info-section">
                <h4>Symptom Details</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Severity:</label>
                        <span class="value">{node.severity}/10</span>
                    </div>
                    {#if node.duration}
                        <div class="info-item">
                            <label>Duration:</label>
                            <span class="value">{node.duration} days</span>
                        </div>
                    {/if}
                    <div class="info-item">
                        <label>Source:</label>
                        <span class="value source-{node.source}">{node.source}</span>
                    </div>
                </div>
                {#if node.quote}
                    <div class="quote-section">
                        <label>Quote:</label>
                        <blockquote>"{node.quote}"</blockquote>
                    </div>
                {/if}
            </section>
        {/if}

        <!-- Diagnosis specific -->
        {#if 'probability' in node}
            <section class="info-section">
                <h4>Diagnosis Details</h4>
                {#if node.icd10}
                    <div class="info-item">
                        <label>ICD-10:</label>
                        <span class="value">{node.icd10}</span>
                    </div>
                {/if}
                {#if node.reasoning}
                    <div class="reasoning-section">
                        <label>Clinical Reasoning:</label>
                        <p>{node.reasoning}</p>
                    </div>
                {/if}
            </section>
        {/if}

        <!-- Treatment specific -->
        {#if 'type' in node && ['medication', 'procedure', 'therapy'].includes(node.type)}
            <section class="info-section">
                <h4>Treatment Details</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Type:</label>
                        <span class="value">{node.type}</span>
                    </div>
                    {#if 'dosage' in node && node.dosage}
                        <div class="info-item">
                            <label>Dosage:</label>
                            <span class="value">{node.dosage}</span>
                        </div>
                    {/if}
                    {#if 'urgency' in node && node.urgency}
                        <div class="info-item">
                            <label>Urgency:</label>
                            <span class="value">{node.urgency}</span>
                        </div>
                    {/if}
                </div>
            </section>
        {/if}

        <!-- Action specific -->
        {#if 'actionType' in node}
            <section class="info-section">
                <h4>Action Details</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <label>Type:</label>
                        <span class="value">{node.actionType}</span>
                    </div>
                    <div class="info-item">
                        <label>Category:</label>
                        <span class="value">{node.category}</span>
                    </div>
                    <div class="info-item">
                        <label>Status:</label>
                        <span class="value status-{node.status}">{node.status}</span>
                    </div>
                </div>
                {#if node.answer}
                    <div class="answer-section">
                        <label>Answer:</label>
                        <p class="answer">{node.answer}</p>
                    </div>
                {/if}
            </section>
        {/if}

        <!-- Relationships -->
        {#if node.relationships && node.relationships.length > 0}
            <section class="info-section">
                <h4>Relationships ({node.relationships.length})</h4>
                <div class="relationships">
                    {#each node.relationships as rel}
                        <div class="relationship-item">
                            <div class="relationship-header">
                                <span class="relationship-type">{rel.relationship}</span>
                                <span class="relationship-strength">{Math.round(rel.strength * 100)}%</span>
                                <span class="relationship-direction">{rel.direction}</span>
                            </div>
                            <div class="relationship-target">→ {rel.nodeId}</div>
                            {#if rel.reasoning}
                                <p class="relationship-reasoning">{rel.reasoning}</p>
                            {/if}
                        </div>
                    {/each}
                </div>
            </section>
        {/if}
    </div>

    <!-- Actions -->
    <footer class="details-actions">
        <button class="action-btn accept" on:click={() => handleNodeAction('accept')}>
            Accept
        </button>
        <button class="action-btn suppress" on:click={() => handleNodeAction('suppress')}>
            Suppress
        </button>
        <button class="action-btn highlight" on:click={() => handleNodeAction('highlight')}>
            Highlight
        </button>
    </footer>
</div>

<style>
    .node-details {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--color-surface, #fff);
    }

    .details-header {
        padding: 1rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
    }

    .node-type {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .type-label {
        font-size: 0.875rem;
        color: var(--color-text-secondary, #6b7280);
        font-weight: 500;
    }

    .priority-badge {
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        border-radius: 12px;
        color: white;
        font-weight: 600;
    }

    .node-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--color-text-primary, #1f2937);
        line-height: 1.4;
    }

    .details-content {
        flex: 1;
        padding: 1rem;
        overflow-y: auto;
    }

    .info-section {
        margin-bottom: 1.5rem;
    }

    .info-section h4 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--color-text-primary, #1f2937);
    }

    .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }

    .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .info-item label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text-secondary, #6b7280);
    }

    .info-item .value {
        font-size: 0.875rem;
        color: var(--color-text-primary, #1f2937);
        font-weight: 500;
    }

    .quote-section,
    .reasoning-section,
    .answer-section {
        margin-top: 1rem;
    }

    .quote-section label,
    .reasoning-section label,
    .answer-section label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text-secondary, #6b7280);
        margin-bottom: 0.5rem;
    }

    blockquote {
        margin: 0;
        padding: 0.75rem 1rem;
        background: var(--color-surface-2, #f8fafc);
        border-left: 3px solid var(--color-primary, #3b82f6);
        border-radius: 0 4px 4px 0;
        font-style: italic;
        color: var(--color-text-secondary, #6b7280);
    }

    .reasoning-section p,
    .answer-section .answer {
        margin: 0;
        padding: 0.75rem;
        background: var(--color-surface-2, #f8fafc);
        border-radius: 6px;
        font-size: 0.875rem;
        color: var(--color-text-primary, #1f2937);
        line-height: 1.5;
    }

    .relationships {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .relationship-item {
        padding: 0.75rem;
        background: var(--color-surface-2, #f8fafc);
        border-radius: 6px;
        border: 1px solid var(--color-border, #e2e8f0);
    }

    .relationship-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
    }

    .relationship-type {
        font-weight: 600;
        color: var(--color-primary, #3b82f6);
    }

    .relationship-strength {
        font-size: 0.875rem;
        color: var(--color-success, #10b981);
        font-weight: 500;
    }

    .relationship-direction {
        font-size: 0.75rem;
        padding: 0.125rem 0.375rem;
        background: var(--color-info-bg, #dbeafe);
        color: var(--color-info, #3b82f6);
        border-radius: 10px;
    }

    .relationship-target {
        font-family: monospace;
        font-size: 0.875rem;
        color: var(--color-text-secondary, #6b7280);
        margin-bottom: 0.5rem;
    }

    .relationship-reasoning {
        margin: 0;
        font-size: 0.875rem;
        color: var(--color-text-primary, #1f2937);
        line-height: 1.4;
    }

    .details-actions {
        display: flex;
        gap: 0.5rem;
        padding: 1rem;
        border-top: 1px solid var(--color-border, #e2e8f0);
    }

    .action-btn {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-surface, #fff);
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .action-btn.accept {
        background: var(--color-success-bg, #dcfce7);
        color: var(--color-success, #16a34a);
        border-color: var(--color-success, #16a34a);
    }

    .action-btn.suppress {
        background: var(--color-error-bg, #fee2e2);
        color: var(--color-error, #dc2626);
        border-color: var(--color-error, #dc2626);
    }

    .action-btn.highlight {
        background: var(--color-warning-bg, #fef3c7);
        color: var(--color-warning, #d97706);
        border-color: var(--color-warning, #d97706);
    }

    .action-btn:hover {
        opacity: 0.8;
    }

    /* Source type styling */
    .value.source-transcript { color: var(--color-success, #16a34a); }
    .value.source-medical_history { color: var(--color-info, #3b82f6); }
    .value.source-family_history { color: var(--color-purple, #8b5cf6); }
    .value.source-suspected { color: var(--color-warning, #f59e0b); }

    /* Status styling */
    .value.status-pending { color: var(--color-warning, #f59e0b); }
    .value.status-answered { color: var(--color-success, #16a34a); }
    .value.status-acknowledged { color: var(--color-info, #3b82f6); }
</style>