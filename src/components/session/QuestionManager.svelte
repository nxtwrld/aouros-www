<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import type { ActionNode, QuestionAnswerEvent } from './types/visualization';

    export let questions: ActionNode[] = [];
    export let alerts: ActionNode[] = [];

    const dispatch = createEventDispatcher<{
        questionAnswer: QuestionAnswerEvent;
    }>();

    let expandedItems = new Set<string>();
    let activeTab: 'questions' | 'alerts' = 'questions';
    let questionFilter: 'all' | 'pending' | 'answered' = 'pending';
    let alertFilter: 'all' | 'pending' | 'acknowledged' = 'all';

    $: filteredQuestions = questions.filter(q => {
        if (questionFilter === 'all') return true;
        if (questionFilter === 'pending') return q.status === 'pending';
        if (questionFilter === 'answered') return q.status === 'answered';
        return true;
    });

    $: filteredAlerts = alerts.filter(a => {
        if (alertFilter === 'all') return true;
        if (alertFilter === 'pending') return a.status === 'pending';
        if (alertFilter === 'acknowledged') return a.status === 'acknowledged';
        return true;
    });

    $: pendingQuestions = questions.filter(q => q.status === 'pending').length;
    $: pendingAlerts = alerts.filter(a => a.status === 'pending').length;

    function toggleExpanded(id: string) {
        if (expandedItems.has(id)) {
            expandedItems.delete(id);
        } else {
            expandedItems.add(id);
        }
        expandedItems = expandedItems;
    }

    function handleQuestionAnswer(questionId: string, answer: string) {
        dispatch('questionAnswer', {
            questionId,
            answer,
            confidence: 0.9
        });
        
        // Collapse the question after answering
        expandedItems.delete(questionId);
        expandedItems = expandedItems;
    }

    function getPriorityColor(priority: number): string {
        if (priority <= 2) return 'var(--color-error, #dc2626)';
        if (priority <= 4) return 'var(--color-warning, #f59e0b)';
        if (priority <= 6) return 'var(--color-info, #3b82f6)';
        return 'var(--color-success, #10b981)';
    }

    function getPriorityLabel(priority: number): string {
        if (priority <= 2) return 'Critical';
        if (priority <= 4) return 'High';
        if (priority <= 6) return 'Medium';
        return 'Low';
    }

    function sortByPriority(items: ActionNode[]): ActionNode[] {
        return [...items].sort((a, b) => (a.priority || 5) - (b.priority || 5));
    }
</script>

<div class="question-manager">
    <header class="manager-header">
        <div class="tabs">
            <button 
                class="tab"
                class:active={activeTab === 'questions'}
                on:click={() => activeTab = 'questions'}
            >
                Questions ({questions.length})
                {#if pendingQuestions > 0}
                    <span class="badge">{pendingQuestions}</span>
                {/if}
            </button>
            <button 
                class="tab"
                class:active={activeTab === 'alerts'}
                on:click={() => activeTab = 'alerts'}
            >
                Alerts ({alerts.length})
                {#if pendingAlerts > 0}
                    <span class="badge">{pendingAlerts}</span>
                {/if}
            </button>
        </div>

        <!-- Filters -->
        <div class="filters">
            {#if activeTab === 'questions'}
                <select bind:value={questionFilter} class="filter-select">
                    <option value="all">All Questions</option>
                    <option value="pending">Pending</option>
                    <option value="answered">Answered</option>
                </select>
            {:else}
                <select bind:value={alertFilter} class="filter-select">
                    <option value="all">All Alerts</option>
                    <option value="pending">Pending</option>
                    <option value="acknowledged">Acknowledged</option>
                </select>
            {/if}
        </div>
    </header>

    <div class="content">
        {#if activeTab === 'questions'}
            <div class="questions-list">
                {#if filteredQuestions.length === 0}
                    <div class="empty-state">
                        <p>No questions to display</p>
                    </div>
                {:else}
                    {#each sortByPriority(filteredQuestions) as question (question.id)}
                        <div class="item-card question-card">
                            <button 
                                class="item-header"
                                on:click={() => toggleExpanded(question.id)}
                            >
                                <div class="header-content">
                                    <div class="priority-indicator" 
                                         style="background-color: {getPriorityColor(question.priority || 5)}">
                                    </div>
                                    <div class="item-info">
                                        <span class="item-text">{question.text}</span>
                                        <div class="item-meta">
                                            <span class="priority">{getPriorityLabel(question.priority || 5)}</span>
                                            <span class="category">{question.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="header-actions">
                                    <span class="status status-{question.status}">{question.status}</span>
                                    <span class="expand-icon" class:expanded={expandedItems.has(question.id)}>
                                        ▼
                                    </span>
                                </div>
                            </button>

                            {#if expandedItems.has(question.id)}
                                <div class="item-details" transition:slide={{ duration: 200 }}>
                                    {#if question.status === 'pending'}
                                        <div class="quick-answers">
                                            <h5>Quick Answer:</h5>
                                            <div class="answer-buttons">
                                                <button 
                                                    class="answer-btn yes"
                                                    on:click={() => handleQuestionAnswer(question.id, 'yes')}
                                                >
                                                    Yes
                                                </button>
                                                <button 
                                                    class="answer-btn no"
                                                    on:click={() => handleQuestionAnswer(question.id, 'no')}
                                                >
                                                    No
                                                </button>
                                                <button 
                                                    class="answer-btn unknown"
                                                    on:click={() => handleQuestionAnswer(question.id, 'unknown')}
                                                >
                                                    Unknown
                                                </button>
                                            </div>
                                        </div>
                                    {:else if question.answer}
                                        <div class="answer-display">
                                            <h5>Answer:</h5>
                                            <p class="answer">{question.answer}</p>
                                        </div>
                                    {/if}

                                    {#if question.impact}
                                        <div class="impact-info">
                                            <h5>Expected Impact:</h5>
                                            {#if question.impact.yes}
                                                <div class="impact-scenario">
                                                    <span class="scenario-label">If Yes:</span>
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
                                                    <span class="scenario-label">If No:</span>
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
                                            <h5>Related to:</h5>
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
                    {/each}
                {/if}
            </div>
        {:else}
            <div class="alerts-list">
                {#if filteredAlerts.length === 0}
                    <div class="empty-state">
                        <p>No alerts to display</p>
                    </div>
                {:else}
                    {#each sortByPriority(filteredAlerts) as alert (alert.id)}
                        <div class="item-card alert-card">
                            <div class="alert-header">
                                <div class="priority-indicator" 
                                     style="background-color: {getPriorityColor(alert.priority || 5)}">
                                </div>
                                <div class="alert-content">
                                    <div class="alert-text">{alert.text}</div>
                                    <div class="alert-meta">
                                        <span class="category category-{alert.category}">{alert.category}</span>
                                        <span class="priority">{getPriorityLabel(alert.priority || 5)}</span>
                                    </div>
                                    {#if alert.recommendation}
                                        <div class="recommendation">
                                            <strong>Recommendation:</strong> {alert.recommendation}
                                        </div>
                                    {/if}
                                </div>
                                <button class="acknowledge-btn" disabled={alert.status === 'acknowledged'}>
                                    {alert.status === 'acknowledged' ? '✓' : 'Ack'}
                                </button>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .question-manager {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .manager-header {
        padding: 1rem;
        border-bottom: 1px solid var(--color-border, #e2e8f0);
    }

    .tabs {
        display: flex;
        gap: 0.25rem;
        margin-bottom: 1rem;
    }

    .tab {
        position: relative;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        border: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-surface, #fff);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .tab.active {
        background: var(--color-primary, #3b82f6);
        color: white;
        border-color: var(--color-primary, #3b82f6);
    }

    .badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--color-error, #dc2626);
        color: white;
        font-size: 0.75rem;
        padding: 0.125rem 0.375rem;
        border-radius: 10px;
        min-width: 16px;
        text-align: center;
    }

    .filters {
        display: flex;
        gap: 0.5rem;
    }

    .filter-select {
        padding: 0.375rem 0.75rem;
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 4px;
        background: var(--color-surface, #fff);
        font-size: 0.875rem;
    }

    .content {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
    }

    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--color-text-secondary, #6b7280);
        font-size: 0.875rem;
    }

    .item-card {
        background: var(--color-surface-2, #f8fafc);
        border: 1px solid var(--color-border, #e2e8f0);
        border-radius: 8px;
        margin-bottom: 0.75rem;
        overflow: hidden;
        transition: box-shadow 0.2s ease;
    }

    .item-card:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .item-header {
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

    .item-info {
        flex: 1;
        min-width: 0;
    }

    .item-text {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text-primary, #1f2937);
        line-height: 1.4;
        margin-bottom: 0.5rem;
    }

    .item-meta {
        display: flex;
        gap: 0.75rem;
        font-size: 0.75rem;
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

    .status-answered,
    .status-acknowledged {
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

    .item-details {
        padding: 0 1rem 1rem;
        background: var(--color-surface, #fff);
    }

    .item-details h5 {
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

    /* Alert specific styles */
    .alert-card {
        border-left: 4px solid var(--color-error, #dc2626);
    }

    .alert-header {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
    }

    .alert-content {
        flex: 1;
    }

    .alert-text {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text-primary, #1f2937);
        line-height: 1.4;
        margin-bottom: 0.5rem;
    }

    .alert-meta {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
    }

    .category-red_flag,
    .category-warning {
        background: var(--color-error-bg, #fee2e2);
        color: var(--color-error, #dc2626);
    }

    .category-drug_interaction,
    .category-contraindication {
        background: var(--color-warning-bg, #fef3c7);
        color: var(--color-warning, #d97706);
    }

    .recommendation {
        font-size: 0.875rem;
        color: var(--color-text-primary, #1f2937);
        line-height: 1.4;
    }

    .acknowledge-btn {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--color-border, #e2e8f0);
        background: var(--color-surface, #fff);
        border-radius: 4px;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .acknowledge-btn:not(:disabled):hover {
        background: var(--color-primary-bg, #dbeafe);
        color: var(--color-primary, #3b82f6);
        border-color: var(--color-primary, #3b82f6);
    }

    .acknowledge-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
        .manager-header,
        .content {
            padding: 0.75rem;
        }

        .item-header {
            padding: 0.75rem;
        }

        .answer-buttons {
            flex-direction: column;
        }
    }
</style>