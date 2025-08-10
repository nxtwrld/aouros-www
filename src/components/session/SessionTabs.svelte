<script lang="ts">
    import Tabs from '../ui/Tabs.svelte';
    import TabHead from '../ui/TabHead.svelte';
    import TabHeads from '../ui/TabHeads.svelte';
    import TabPanel from '../ui/TabPanel.svelte';
    import SessionQuestionsTab from './SessionQuestionsTab.svelte';
    import SessionTranscriptTab from './SessionTranscriptTab.svelte';
    import SessionDetailsTab from './SessionDetailsTab.svelte';
    import SessionLegendTab from './SessionLegendTab.svelte';
    import type { SessionAnalysis } from './types/visualization';
    import { t } from '$lib/i18n';

    interface Props {
        sessionData: SessionAnalysis;
        transcript: {
            speaker: string;
            text: string;
            stress: string;
            urgency: string;
        }[];
        selectedNode: any | null;
        selectedLink: any | null;
        pendingQuestions: number;
        isMobile?: boolean;
        tabsRef?: any;
        onnodeAction?: (detail: { action: string; targetId: string; reason?: string }) => void;
        onrelationshipNodeClick?: (detail: { nodeId: string }) => void;
    }

    let { 
        sessionData, 
        transcript = [], 
        selectedNode,
        selectedLink, 
        pendingQuestions, 
        isMobile = false,
        tabsRef = $bindable(),
        onnodeAction,
        onrelationshipNodeClick 
    }: Props = $props();

    // Filter questions and alerts
    const questions = $derived(sessionData.nodes.actions?.filter(a => a.actionType === 'question') || []);
    const alerts = $derived(sessionData.nodes.actions?.filter(a => a.actionType === 'alert') || []);
    const hasTranscript = $derived(transcript && transcript.length > 0);
</script>

<Tabs bind:this={tabsRef}>
    <TabHeads>
        <TabHead>
            {$t('session.tabs.questions')}
            {#if pendingQuestions > 0}
                <span class="badge">{pendingQuestions}</span>
            {/if}
        </TabHead>
        {#if hasTranscript}
            <TabHead>{$t('session.tabs.transcript')}</TabHead>
        {/if}
        <TabHead>{$t('session.tabs.details')}</TabHead>
        {#if !isMobile}
            <TabHead>{$t('session.tabs.legend')}</TabHead>
        {/if}
    </TabHeads>
    <div class="tab-panels">
    <TabPanel>
        <SessionQuestionsTab 
            {questions}
            {alerts}
        />
    </TabPanel>
    
    {#if hasTranscript}
        <TabPanel>
            <SessionTranscriptTab conversation={transcript} />
        </TabPanel>
    {/if}
    
    <TabPanel>
        <SessionDetailsTab 
            {selectedNode}
            {selectedLink}
            allNodes={sessionData.nodes}
            {onnodeAction}
            {onrelationshipNodeClick}
            {isMobile}
        />
    </TabPanel>
    
    {#if !isMobile}
        <TabPanel>
            <SessionLegendTab />
        </TabPanel>
    {/if}
    </div>
</Tabs>

<style>
    .badge {
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        background: var(--color-error, #dc2626);
        color: white;
        font-size: 0.625rem;
        padding: 0.125rem 0.375rem;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
        font-weight: 600;
    }

    .tab-panels {
        height: calc(100% - var(--toolbar-height));
        overflow: auto;

    }
    
</style>