<script lang="ts">
    import type { Link } from "$lib/common.types.d";
    import LinkedItems from "$components/ui/LinkedItems.svelte";
    import ItemPreview from "$components/ui/ItemPreview.svelte";

    

    export let items: Link[] = [];


</script>
<LinkedItems bind:items={items} removable={true}>
    <svelte:fragment slot="view" let:item >
        <ItemPreview {item} passive={true} />
    </svelte:fragment>
</LinkedItems>
