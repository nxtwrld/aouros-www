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

{#if documents}
<div class="tiles">
{#each $documents as document}
    {@const author = getByAnotherAuthor(document.author_id)}

    <a href="/med/p/{document.user_id}/documents/{document.id}" class="tile -vertical">
        {document.metadata.title}

        {#if author}
            {author.fullName}
        {/if}

        <div class="actions"></div>
    </a>
{/each}
</div>
{/if}