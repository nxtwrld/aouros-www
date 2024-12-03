<script lang="ts">
    import { getDocument, type Document } from '$lib/med/documents';
    import Loading from '$components/ui/Loading.svelte';
    import { onMount } from 'svelte';
    import DocumentView from '$components/documents/DocumentView.svelte';
    import DocumentHeading from '$components/documents/DocumentHeading.svelte';
    import DocumentToolbar from '$components/documents/DocumentToolbar.svelte';

    export let  data: {
        document_id: string;
    }

    let document: Document | null = null;
    onMount(async () => {
        document = await getDocument(data.document_id);
    });

    
</script>


{#if !document}
<Loading/>
{:else}
    <div class="page -empty  -heading-master">

        <DocumentHeading {document} />
        <DocumentToolbar {document} />
        <DocumentView {document} />
    </div>
    
{/if}
