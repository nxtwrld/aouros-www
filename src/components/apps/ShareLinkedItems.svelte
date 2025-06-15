<script lang="ts">
    import type { Link } from "$lib/common.types.d";
    import LinkedItems from "$components/ui/LinkedItems.svelte";
    import ItemPreview from "$components/ui/ItemPreview.svelte";

    

    interface Props {
        items?: Link[];
    }

    let { items = $bindable([]) }: Props = $props();


</script>
<LinkedItems bind:items={items} removable={true}>
    {#snippet view({ item })}
    
            <ItemPreview {item} passive={true} />
        
    {/snippet}
</LinkedItems>
