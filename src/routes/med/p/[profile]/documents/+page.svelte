<script lang="ts">
    import { byUser } from '$slib/med/documents';
    import { profile } from '$slib/med/profiles';


    const documents = byUser($profile.id);
    console.log(documents, $documents);
</script>

<div class="page">

<h1 class="h1">Documents</h1>


{#each $documents as doc}
    <div class="document">
        <a href="/med/p/{$profile.id}/documents/{doc.id}">

            {doc.metadata.title} - 
            {doc.type} -
            {doc.metadata.tags.join(', ')}
        </a>
    </div>
{/each}

</div>