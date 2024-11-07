<script lang="ts">
    import { type Profile } from '$slib/med/types.d';
    import { type DocumentEncrypted, importDocuments } from '$slib/med/documents';
    import user from '$slib/user';
    import { profile } from '$slib/med/profiles';
    export let data: {
        profile: Profile;
        documents: DocumentEncrypted[];
    }

    $: profile.set(data.profile);
    $: importDocuments(data.documents);


</script>


<slot />
