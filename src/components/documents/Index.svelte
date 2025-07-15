<script lang="ts">
    import { profile } from '$lib/profiles';
    import userStore from '$lib/user';
    import { byUser } from '$lib/documents';
    import { type Document } from '$lib/documents/types.d';
    import DocumentTile from './DocumentTile.svelte';

  interface Props {
    user?: string;
  }

  let { user = $profile?.id || $userStore?.id as string }: Props = $props();
    let documents = byUser(user);


//    console.log('documents', $documents);

    function sortByDate(a: any, b: any) {
        if (!a.metadata.date) return 1;
        if (!b.metadata.date) return -1;
        return new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime();
    }


</script>


<!--button class="button" on:click={testSignals}>Test signals</button>
<button class="button" on:click={testUpdateDocument}>Test update</button>
<button class="button" on:click={checkHealthProfile}>Check</button-->

{#if documents}
<div class="tiles">
{#each $documents.sort(sortByDate) as document}
  <DocumentTile document={document as Document} />
{/each}
</div>
{/if}

