<script lang="ts">
    import { getDocument, type Document } from '$lib/med/documents';
    import Loading from '$components/ui/Loading.svelte';
    import { onMount } from 'svelte';

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
    <div class="page">
        <h1 class="h1">{document.title}</h1>

        <p>{document.tags}</p>
    </div>
{/if}
