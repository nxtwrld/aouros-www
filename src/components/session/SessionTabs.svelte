<script lang="ts">
    import Tabs from '../ui/Tabs.svelte';
    import TabHead from '../ui/TabHead.svelte';
    import TabHeads from '../ui/TabHeads.svelte';
    import TabPanel from '../ui/TabPanel.svelte';
    import SessionQuestionsTab from './SessionQuestionsTab.svelte';
    import SessionTranscriptTab from './SessionTranscriptTab.svelte';
    import SessionDetailsTab from './SessionDetailsTab.svelte';
    import SessionLegendTab from './SessionLegendTab.svelte';
    import type { SessionAnalysis, QuestionAnswerEvent } from './types/visualization';

    interface Props {
        sessionData: SessionAnalysis;
        transcript: {
            speaker: string;
            text: string;
            stress: string;
            urgency: string;
        }[];
        selectedNode: any | null;
        pendingQuestions: number;
        isMobile?: boolean;
        tabsRef?: any;
        onquestionAnswer?: (event: CustomEvent<QuestionAnswerEvent>) => void;
        onnodeAction?: (event: CustomEvent<{ action: string; targetId: string; reason?: string }>) => void;
    }

    let { 
        sessionData, 
        transcript = [], 
        selectedNode, 
        pendingQuestions, 
        isMobile = false,
        tabsRef = $bindable(),
        onquestionAnswer, 
        onnodeAction 
    }: Props = $props();

    // Filter questions and alerts
    const questions = $derived(sessionData.nodes.actions?.filter(a => a.actionType === 'question') || []);
    const alerts = $derived(sessionData.nodes.actions?.filter(a => a.actionType === 'alert') || []);
    const hasTranscript = $derived(transcript && transcript.length > 0);
</script>

<Tabs bind:this={tabsRef}>
    <TabHeads>
        <TabHead>
            Questions
            {#if pendingQuestions > 0}
                <span class="badge">{pendingQuestions}</span>
            {/if}
        </TabHead>
        {#if hasTranscript}
            <TabHead>Transcript</TabHead>
        {/if}
        <TabHead>Details</TabHead>
        {#if !isMobile}
            <TabHead>Legend</TabHead>
        {/if}
    </TabHeads>
    
    <TabPanel>
        <SessionQuestionsTab 
            {questions}
            {alerts}
            {onquestionAnswer}
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
            allNodes={sessionData.nodes}
            {onnodeAction}
            {isMobile}
        />
    </TabPanel>
    
    {#if !isMobile}
        <TabPanel>
            <SessionLegendTab />
        </TabPanel>
    {/if}
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
</style>