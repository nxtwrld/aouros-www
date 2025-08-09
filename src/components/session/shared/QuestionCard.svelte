<script lang="ts">
    import { createBubbler } from 'svelte/legacy';
    import { slide } from 'svelte/transition';
    import type { ActionNode } from '../types/visualization';
    import { t } from '$lib/i18n';

    interface Props {
        question: ActionNode;
        expanded?: boolean;
        compact?: boolean;
        onquestionAnswer?: (questionId: string, answer: string) => void;
        ontoggleExpanded?: (questionId: string) => void;
    }

    let { 
        question, 
        expanded = false, 
        compact = false,
        onquestionAnswer,
        ontoggleExpanded
    }: Props = $props();

    const bubble = createBubbler();

    function handleQuestionAnswer(answer: string) {
        onquestionAnswer?.(question.id, answer);
    }

    function handleToggleExpanded() {
        ontoggleExpanded?.(question.id);
    }

    function getPriorityColor(priority: number): string {
        if (priority <= 2) return 'var(--color-error, #dc2626)';
        if (priority <= 4) return 'var(--color-warning, #f59e0b)';
        if (priority <= 6) return 'var(--color-info, #3b82f6)';
        return 'var(--color-success, #10b981)';
    }

    function getPriorityLabel(priority: number): string {
        if (priority <= 2) return $t('session.priority.critical');
        if (priority <= 4) return $t('session.priority.high');
        if (priority <= 6) return $t('session.priority.medium');
        return $t('session.priority.low');
    }
</script>

<div class="question-card" class:compact use:bubble>
    <button 
        class="question-header"
        onclick={handleToggleExpanded}
        disabled={compact}
    >
        <div class="header-content">
            <div class="priority-indicator" 
                 style="background-color: {getPriorityColor(question.priority || 5)}">
            </div>
            <div class="question-info">
                <span class="question-text">{question.text}</span>
                <div class="question-meta">
                    <span class="priority">{getPriorityLabel(question.priority || 5)}</span>
                    <span class="category">{question.category}</span>
                </div>
            </div>
        </div>
        {#if !compact}
            <div class="header-actions">
                <span class="status status-{question.status}">{question.status}</span>
                <span class="expand-icon" class:expanded>
                    ▼
                </span>
            </div>
        {/if}
    </button>

    {#if expanded && !compact}
        <div class="question-details" transition:slide={{ duration: 200 }}>
            {#if question.status === 'pending'}
                <div class="quick-answers">
                    <h5>{$t('session.labels.quick-answer')}:</h5>
                    <div class="answer-buttons">
                        <button 
                            class="answer-btn yes"
                            onclick={() => handleQuestionAnswer('yes')}
                        >
                            {$t('session.actions.yes')}
                        </button>
                        <button 
                            class="answer-btn no"
                            onclick={() => handleQuestionAnswer('no')}
                        >
                            {$t('session.actions.no')}
                        </button>
                        <button 
                            class="answer-btn unknown"
                            onclick={() => handleQuestionAnswer('unknown')}
                        >
                            {$t('session.actions.unknown')}
                        </button>
                    </div>
                </div>
            {:else if question.answer}
                <div class="answer-display">
                    <h5>{$t('session.labels.answer')}:</h5>
                    <p class="answer">{question.answer}</p>
                </div>
            {/if}

            {#if question.impact}
                <div class="impact-info">
                    <h5>{$t('session.labels.expected-impact')}:</h5>
                    {#if question.impact.yes}
                        <div class="impact-scenario">
                            <span class="scenario-label">{$t('session.labels.if-yes')}:</span>
                            <ul>
                                {#each Object.entries(question.impact.yes) as [diagId, impact]}
                                    <li class="impact-item" class:positive={impact > 0} class:negative={impact < 0}>
                                        {diagId}: {impact > 0 ? '+' : ''}{Math.round(impact * 100)}%
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                    {#if question.impact.no}
                        <div class="impact-scenario">
                            <span class="scenario-label">{$t('session.labels.if-no')}:</span>
                            <ul>
                                {#each Object.entries(question.impact.no) as [diagId, impact]}
                                    <li class="impact-item" class:positive={impact > 0} class:negative={impact < 0}>
                                        {diagId}: {impact > 0 ? '+' : ''}{Math.round(impact * 100)}%
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/if}
                </div>
            {/if}

            {#if question.relationships && question.relationships.length > 0}
                <div class="relationships-info">
                    <h5>{$t('session.labels.related-to')}:</h5>
                    <ul class="relationships-list">
                        {#each question.relationships as rel}
                            <li class="relationship">
                                <span class="rel-type">{rel.relationship}</span>
                                <span class="rel-target">{rel.nodeId}</span>
                                <span class="rel-strength">{Math.round(rel.strength * 100)}%</span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .question-card {
        background: var(--color-surface-2, #f8fafc);
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 8px;
        margin-bottom: 0.75rem;
        overflow: hidden;
        transition: box-shadow 0.2s ease;
    }

    .question-card.compact {
        margin-bottom: 0.5rem;
        border-radius: 6px;
    }

    .question-card:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .question-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 1rem;
        background: transparent;
        border: none;
        text-align: left;
        cursor: pointer;
        gap: 1rem;
    }

    .question-card.compact .question-header {
        padding: 0.75rem;
        cursor: default;
    }

    .header-content {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        flex: 1;
    }

    .priority-indicator {
        width: 4px;
        height: 24px;
        border-radius: 2px;
        flex-shrink: 0;
        margin-top: 2px;
    }

    .question-info {
        flex: 1;
        min-width: 0;
    }

    .question-text {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text-primary, #1f2937);
        line-height: 1.4;
        margin-bottom: 0.5rem;
    }

    .question-meta {
        display: flex;
        gap: 0.75rem;
        font-size: 0.75rem;
        flex-wrap: wrap;
    }

    .priority,
    .category {
        padding: 0.125rem 0.5rem;
        border-radius: 12px;
        font-weight: 500;
    }

    .priority {
        background: var(--color-primary-bg, #dbeafe);
        color: var(--color-primary, #3b82f6);
    }

    .category {
        background: var(--color-surface, #fff);
        color: var(--color-text-secondary, #6b7280);
        border: 1px solid var(--color-border, #e2e8f0);
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    .status {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-weight: 500;
    }

    .status-pending {
        background: var(--color-warning-bg, #fef3c7);
        color: var(--color-warning, #d97706);
    }

    .status-answered {
        background: var(--color-success-bg, #dcfce7);
        color: var(--color-success, #16a34a);
    }

    .expand-icon {
        transition: transform 0.2s ease;
        color: var(--color-text-secondary, #6b7280);
        font-size: 0.75rem;
    }

    .expand-icon.expanded {
        transform: rotate(180deg);
    }

    .question-details {
        padding: 0 1rem 1rem;
        background: var(--color-surface, #fff);
    }

    .question-details h5 {
        margin: 0 0 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--color-text-primary, #1f2937);
    }

    .quick-answers {
        margin-bottom: 1rem;
    }

    .answer-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .answer-btn {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .answer-btn.yes {
        background: var(--color-success-bg, #dcfce7);
        color: var(--color-success, #16a34a);
        border-color: var(--color-success, #16a34a);
    }

    .answer-btn.no {
        background: var(--color-error-bg, #fee2e2);
        color: var(--color-error, #dc2626);
        border-color: var(--color-error, #dc2626);
    }

    .answer-btn.unknown {
        background: var(--color-surface, #fff);
        color: var(--color-text-primary, #1f2937);
    }

    .answer-btn:hover {
        opacity: 0.8;
    }

    .answer-display .answer {
        background: var(--color-success-bg, #dcfce7);
        color: var(--color-success, #16a34a);
        padding: 0.5rem;
        border-radius: 4px;
        font-weight: 500;
        margin: 0;
    }

    .impact-info,
    .relationships-info {
        margin-top: 1rem;
    }

    .impact-scenario {
        margin-bottom: 0.75rem;
    }

    .scenario-label {
        font-weight: 500;
        color: var(--color-text-primary, #1f2937);
        display: block;
        margin-bottom: 0.25rem;
    }

    .impact-item {
        font-size: 0.875rem;
        padding: 0.25rem 0;
    }

    .impact-item.positive {
        color: var(--color-success, #16a34a);
    }

    .impact-item.negative {
        color: var(--color-error, #dc2626);
    }

    .relationships-list {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .relationship {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0;
        font-size: 0.875rem;
    }

    .rel-type {
        font-weight: 500;
        color: var(--color-primary, #3b82f6);
    }

    .rel-target {
        font-family: monospace;
        color: var(--color-text-secondary, #6b7280);
    }

    .rel-strength {
        font-size: 0.75rem;
        color: var(--color-success, #16a34a);
        margin-left: auto;
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
        .question-header {
            padding: 0.75rem;
        }

        .answer-buttons {
            flex-direction: column;
        }

        .question-meta {
            gap: 0.5rem;
        }
    }
</style>