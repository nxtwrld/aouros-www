<script lang="ts">
    import Tabs from '../ui/Tabs.svelte';
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

<Tabs bind:this={tabsRef} fixedHeight={false}>
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
</Tabs>

<style>
    /* Tab panels inherit height and overflow from parent Tabs component */
</style>