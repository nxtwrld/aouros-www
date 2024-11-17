<script lang="ts">

    import { profile } from '$lib/med/profiles';
    import userStore from '$lib/user';
    import { byUser} from '$lib/med/documents';
    import { getByAnotherAuthor } from '$lib/med/documents/tools';
    import { type Profile } from '$lib/med/types.d';
    import { t } from '$lib/i18n';

    export let user: string = $profile?.id || $userStore?.id as string;
    let documents = byUser(user);


    console.log('documents', $documents);

</script>

<h3 class="h3 heading">{ $t('app.headings.documents') }</h3>
{#if documents}
<div class="tiles">
{#each $documents as document}
    {@const author = getByAnotherAuthor(document.author_id)}

    <div class="tile -vertical">
        {document.metadata.title}

        {#if author}
            {author.fullName}
        {/if}

        <div class="actions"></div>
    </div>
{/each}
</div>
{/if}