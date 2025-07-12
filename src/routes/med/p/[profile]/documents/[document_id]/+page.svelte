<script lang="ts">
    import { getDocument } from '$lib/documents';
    import type { Document } from '$lib/documents/types.d';
    import Loading from '$components/ui/Loading.svelte';
    import { onMount } from 'svelte';
    import DocumentView from '$components/documents/DocumentView.svelte';
    import DocumentHeading from '$components/documents/DocumentHeading.svelte';
    import DocumentToolbar from '$components/documents/DocumentToolbar.svelte';
    import AppConnect from '$components/apps/AppConnect.svelte';

    interface Props {
        data: {
        document_id: string;
    };
    }

    let { data }: Props = $props();

    let document: Document | null = $state(null);
    onMount(async () => {
        document = await getDocument(data.document_id) || null;
    });

    
</script>


{#if !document}
<Loading/>
{:else}
    <div class="page -empty  -heading-master">

        <DocumentHeading {document} />
        <DocumentToolbar {document} />
        <AppConnect {document} shared={[document]}/>
        <DocumentView {document} />
    </div>
    
{/if}
