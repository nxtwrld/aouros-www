<script lang="ts">

    import { profile } from '$lib/med/profiles';
    import userStore from '$lib/user';
    import { byUser} from '$lib/med/documents';
    import { t } from '$lib/i18n';


    export let user: string = $profile?.id || $userStore?.id as string;
    let documents = byUser(user);


    console.log('documents', user, documents, $documents);

</script>

<h3 class="h3 heading">{ $t('app.headings.documents') }</h3>
{#if documents}
<div class="tiles">
{#each $documents as document}
    <div class="tile -vertical">
        {document.metadata.title}
    </div>
{/each}
</div>
{/if}