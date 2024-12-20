<script lang="ts">
    import { profile } from '$lib/med/profiles';
    import userStore from '$lib/user';
    import { byUser } from '$lib/med/documents';
    import { type Document } from '$lib/med/documents/types.d';
    import DocumentTile from './DocumentTile.svelte';

    export let user: string = $profile?.id || $userStore?.id as string;
    let documents = byUser(user);


//    console.log('documents', $documents);

    function sortByDate(a: Document, b: Document) {
        if (!a.metadata.date) return 1;
        if (!b.metadata.date) return -1;
        return new Date(b.metadata.date) - new Date(a.metadata.date);
    }


</script>


<!--button class="button" on:click={testSignals}>Test signals</button>
<button class="button" on:click={testUpdateDocument}>Test update</button>
<button class="button" on:click={checkHealthProfile}>Check</button-->

{#if documents}
<div class="tiles">
{#each $documents.sort(sortByDate) as document}
  <DocumentTile {document} />
{/each}
</div>
{/if}

