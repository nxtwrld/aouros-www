<script lang="ts">

    import { profile } from '$slib/med/profiles';
    import userStore from '$slib/user';
    import { byUser} from '$slib/med/documents';


    export let user: string = $profile?.id || $userStore?.id as string;
    let documents = byUser(user);


    console.log('documents', user, documents, $documents);

</script>

<h3 class="h3 heading">Documents</h3>
{#if documents}
<div class="tiles">
{#each $documents as document}
    <div class="tile -vertical">
        {document.metadata.title}
    </div>
{/each}
</div>
{/if}