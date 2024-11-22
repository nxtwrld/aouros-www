<script lang="ts">
	import Tags from './Tags.svelte';

    import SectionSummary from './SectionSummary.svelte';
    import SectionDiagnosis from './SectionDiagnosis.svelte';
    import SectionRecommendations from './SectionRecommendations.svelte';
    import SectionBody from './SectionBody.svelte';
    import SectionSignals from './SectionSignals.svelte';
    import SectionText from './SectionText.svelte';
    import SectionPerformer from './SectionPerformer.svelte';
    import SectionAttachments from './SectionAttachments.svelte';

    export let document: Document;
console.log('DOCUMENT', document);
</script>


<div class="report">
    <SectionSummary data={document.content.summary} />
    <div class="page -block">
        {document.content.category} -  {document.content.date}
        <Tags tags={document.content.tags} />
    </div>

    <SectionDiagnosis data={document.content.diagnosis} />


 

    <SectionBody data={document.content.bodyParts} />

    <SectionRecommendations data={document.content.recommendations} />
    
    <SectionSignals data={document.content.signals} />


    <SectionText data={{
            original: document.content.content,
            text: document.content.localizedContent,
            language: document.language || 'en'

        }} />
    <SectionPerformer data={document.content.performer} />

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
