<script lang="ts">
    import { byUser } from '$lib/documents';
    import { profile } from '$lib/profiles';
    import Documents from '$components/documents/Index.svelte';
    import { t } from '$lib/i18n';
    //const documents = byUser($profile.id);

    export let data: {
        filters: {
            tags: string[];
        }
    };
    console.log('data', data);
</script>

<div class="page -empty">

<h1 class="h1 heading">Documents</h1>

<Documents user={$profile.id}/>

</div>