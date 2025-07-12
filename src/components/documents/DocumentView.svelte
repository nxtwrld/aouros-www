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
    import SectionPrescriptions from './SectionPrescriptions.svelte';
    
    import type { Document } from '$lib/documents/types.d';

    interface Props {
        document: Document;
    }

    let { document }: Props = $props();
    
    // Pure data-driven approach: render whatever sections exist in the document
    // AI feature detection populates document sections, UI simply renders them
    const availableSections = [
        { id: 'summary', component: SectionSummary, name: 'Summary' },
        { id: 'diagnosis', component: SectionDiagnosis, name: 'Diagnosis' },
        { id: 'bodyParts', component: SectionBody, name: 'Body Parts' },
        { id: 'recommendations', component: SectionRecommendations, name: 'Recommendations' },
        { id: 'signals', component: SectionSignals, name: 'Signals & Lab Results' },
        { id: 'text', component: SectionText, name: 'Text Content' },
        { id: 'performer', component: SectionPerformer, name: 'Healthcare Provider' },
        { id: 'links', component: SectionLinks, name: 'Related Links' },
        { id: 'attachments', component: SectionAttachments, name: 'Attachments' },
        { id: 'prescriptions', component: SectionPrescriptions, name: 'Prescriptions' },
        // Note: Additional section components will be added as they're implemented:
        // { id: 'imaging', component: SectionImaging, name: 'Imaging Studies' },
        // { id: 'procedures', component: SectionProcedures, name: 'Procedures' },
        // { id: 'specimens', component: SectionSpecimens, name: 'Specimens' },
        // etc.
    ];
    
    // Get sections that have data in the document
    let sectionsToRender = $derived(() => {
        return availableSections.filter(section => {
            const data = getSectionData(section.id);
            return data !== null && data !== undefined;
        });
    });
    
    // Get data for a section from the document
    function getSectionData(sectionId: string) {
        switch(sectionId) {
            case 'summary':
                return document.content.summary;
            case 'diagnosis':
                return document.content.diagnosis;
            case 'bodyParts':
                return document.content.bodyParts;
            case 'recommendations':
                return document.content.recommendations;
            case 'signals':
                // Signals section handles both signals and laboratory data
                return document.content.signals || document.content.laboratory;
            case 'prescriptions':
                return document.content.prescriptions || document.content.prescription;
            case 'text':
                return {
                    original: document.content.content,
                    text: document.content.localizedContent,
                    language: document.content.language || 'en'
                };
            case 'performer':
                return document.content.performer;
            case 'links':
                return document.content.links;
            case 'attachments':
                return document.content.attachments;
            // Enhanced sections - will be rendered when AI populates them
            case 'imaging':
                return document.content.imaging;
            case 'dental':
                return document.content.dental;
            case 'immunizations':
                return document.content.immunizations;
            case 'admission':
                return document.content.admission;
            case 'procedures':
                return document.content.procedures;
            case 'anesthesia':
                return document.content.anesthesia;
            case 'specimens':
                return document.content.specimens;
            case 'microscopic':
                return document.content.microscopic;
            case 'molecular':
                return document.content.molecular;
            case 'ecg':
                return document.content.ecg;
            case 'echo':
                return document.content.echo;
            case 'triage':
                return document.content.triage;
            case 'treatments':
                return document.content.treatments;
            case 'assessment':
                return document.content.assessment;
            // Future enhanced sections (will be added when components are created)
            case 'tumorCharacteristics':
                return document.content.tumorCharacteristics;
            case 'treatmentPlan':
                return document.content.treatmentPlan;
            case 'treatmentResponse':
                return document.content.treatmentResponse;
            case 'imagingFindings':
                return document.content.imagingFindings;
            case 'grossFindings':
                return document.content.grossFindings;
            case 'specialStains':
                return document.content.specialStains;
            case 'allergies':
                return document.content.allergies;
            case 'medications':
                return document.content.medications;
            case 'socialHistory':
                return document.content.socialHistory;
            default:
                return null;
        }
    }
    
</script>


<div class="report -heading-sub">
    <!-- Pure data-driven rendering: show sections that exist in the document -->
    {#each sectionsToRender() as section}
        {#if section.id === 'summary'}
            <!-- Special handling for summary section to include tags -->
            <section.component data={getSectionData(section.id)} />
            <div class="page -block">
                <Tags tags={document.content.tags} />
            </div>
        {:else}
            {@const data = getSectionData(section.id)}
            {#if data}
                <section.component {data} {document} key={document.key} />
            {/if}
        {/if}
    {/each}
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
