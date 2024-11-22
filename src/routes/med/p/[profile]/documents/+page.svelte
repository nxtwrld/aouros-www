<script lang="ts">
    import { byUser } from '$lib/med/documents';
    import { profile } from '$lib/med/profiles';
    import Documents from '$components/documents/Index.svelte';
    import { t } from '$lib/i18n';
    //const documents = byUser($profile.id);

</script>

<div class="page -empty">

<h1 class="h1 heading">Documents</h1>

<Documents user={$profile.id}/>

</div>