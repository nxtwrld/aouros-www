<script lang="ts">
    import documents from '$slib/med/documents';
    import { profile } from '$slib/med/profiles';

</script>

<div class="page">

<h1 class="h1">Documents</h1>


{#each $documents as doc}
    <div class="document">
        <a href="/med/p/{$profile.id}/documents/{doc.id}">

            {doc.title} - 
            {doc.tags}
        </a>
    </div>
{/each}

</div>