<script lang="ts">
    import { type Document } from '$lib/documents/types.d';
    import { removeDocument } from '$lib/documents';
    import { goto } from '$app/navigation';


    interface Props {
        document: Document;
    }

    let { document }: Props = $props();

    async function remove() {
        console.log('remove document', document);
        if (confirm('Are you sure you want to remove this document?')) {
            await removeDocument(document.id);
            goto('/med/p/' + document.user_id + '/documents');
        }
    }

</script>
<div class="toolbar">
    <button class="" onclick={remove}>Remove</button>
</div>



<style>
    .toolbar {
        height: var(--heading-height);
        margin-bottom: var(--gap);
    }
</style>