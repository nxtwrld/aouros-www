<script lang="ts">
    import { createBubbler } from 'svelte/legacy';
    import QuestionsSection from './shared/QuestionsSection.svelte';
    import AlertsSection from './shared/AlertsSection.svelte';
    import type { ActionNode, QuestionAnswerEvent } from './types/visualization';
    import { t } from '$lib/i18n';

    interface Props {
        questions?: ActionNode[];
        alerts?: ActionNode[];
        onquestionAnswer?: (event: CustomEvent<QuestionAnswerEvent>) => void;
    }

    let { questions = [], alerts = [], onquestionAnswer }: Props = $props();

    const bubble = createBubbler();

    let activeTab: 'questions' | 'alerts' = $state('questions');

    const pendingQuestions = $derived(questions.filter(q => q.status === 'pending').length);
    const pendingAlerts = $derived(alerts.filter(a => a.status === 'pending').length);

    function handleQuestionAnswer(questionId: string, answer: string) {
        const event = new CustomEvent('questionAnswer', {
            detail: {
                questionId,
                answer,
                confidence: 0.9
            }
        });
        onquestionAnswer?.(event);
    }

    function handleAlertAcknowledge(alertId: string) {
        // TODO: Handle alert acknowledgment
        console.log('Alert acknowledged:', alertId);
    }
</script>

<div class="question-manager" use:bubble>
    <header class="manager-header">
        <div class="tabs">
            <button 
                class="tab"
                class:active={activeTab === 'questions'}
                onclick={() => activeTab = 'questions'}
            >
                {$t('session.headers.questions')} ({questions.length})
                {#if pendingQuestions > 0}
                    <span class="badge">{pendingQuestions}</span>
                {/if}
            </button>
            <button 
                class="tab"
                class:active={activeTab === 'alerts'}
                onclick={() => activeTab = 'alerts'}
            >
                {$t('session.headers.alerts')} ({alerts.length})
                {#if pendingAlerts > 0}
                    <span class="badge">{pendingAlerts}</span>
                {/if}
            </button>
        </div>
    </header>

    <div class="content">
        {#if activeTab === 'questions'}
            <QuestionsSection 
                {questions}
                showFilters={true}
                onquestionAnswer={handleQuestionAnswer}
            />
        {:else}
            <AlertsSection 
                {alerts}
                showFilters={true}
                onalertAcknowledge={handleAlertAcknowledge}
            />
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
        font-weight: 500;
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

    .content {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
        .manager-header,
        .content {
            padding: 0.75rem;
        }
    }
</style>