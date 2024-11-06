<script lang="ts">
    import { type Patient } from '$slib/med/types.d';
    import { type DocumentEncrypted, importDocuments } from '$slib/med/documents';
    import user from '$slib/user';
    import { profile } from '$slib/med/profiles';
    export let data: {
        profile: Patient;
        documents: DocumentEncrypted[];
    }

    $: profile.set(data.profile);
    $: importDocuments(data.documents);


</script>


<slot />
