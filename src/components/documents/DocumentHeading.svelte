<script lang="ts">
    import { type Document } from '$lib/med/documents/types.d';
    export let document: Document;  
</script>

<h1 class="h1 heading category-{document.metadata.category}">
    <svg class="heading-icon">
        <use href="/icons-o.svg#report-{document.metadata.category}" />
    </svg>
{document.metadata.title}</h1>



<style>

</style>
