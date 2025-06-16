<script lang="ts">
	import Tags from './Tags.svelte';
    import SectionSummary from './SectionSummary.svelte';
    import SectionDiagnosis from './SectionDiagnosis.svelte';
    import SectionRecommendations from './SectionRecommendations.svelte';
    import SectionBody from './SectionBody.svelte';
    import SectionSignals from './SectionSignals.svelte';
    import SectionText from './SectionText.svelte';
    import SectionPerformer from './SectionPerformer.svelte';
    import SectionLinks from './SectionLinks.svelte';
    import SectionAttachments from './SectionAttachments.svelte';
    import type { Document } from '$lib/documents/types.d';

    interface Props {
        document: Document; //console.log('DOCUMENT', document);
    }

    let { document }: Props = $props();
    
</script>


<div class="report -heading-sub">
    <SectionSummary data={document.content.summary} />
    <div class="page -block">
        <Tags tags={document.content.tags} />
    </div>

    <SectionDiagnosis data={document.content.diagnosis} />


 

    <SectionBody data={document.content.bodyParts} />

    <SectionRecommendations data={document.content.recommendations} />
    
    <SectionSignals data={document.content.signals} {document} />


    <SectionText data={{
            original: document.content.content,
            text: document.content.localizedContent,
            language: document.language || 'en'

        }} />
    <SectionPerformer data={document.content.performer} />
    <SectionLinks data={document.content.links} />

    <SectionAttachments data={document.content.attachments} key={document.key} />



</div>
<!--pre>
    {JSON.stringify(document, null, 2)}
</pre-->


<style>
    .report {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }
    .report :global(.heading)  {
        background-color: var(--color-gray-500);
    }
</style>
