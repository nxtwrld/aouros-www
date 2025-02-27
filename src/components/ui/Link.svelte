<script lang="ts" context="module">

    export enum LinkType {
        Report = 'report',
        Contact = 'contact',
        Focus = 'focus',
        Event = 'event',
        Medication = 'medication',
        Question = 'question'
    }
</script>
<script lang="ts">
    import Modal from '$components/ui/Modal.svelte';

    export let object: any;
    export let reference: any;
    export let type: LinkType;
    export let label: string = 'Link';

    let className: string = 'button';
    export {
        className as class
    }

    export let showDialog: boolean = false;

    function link() {
        console.log('linking', object, reference, type);
    }
</script>
<button class={className} on:click={() => showDialog = true}>
    {#if $$slots.default}
        <slot />
    {:else}
        {label}
    {/if}
</button>

{#if showDialog}
<Modal on:close={() => showDialog = false}>
Link {type} ({object.uid}) to anything

</Modal>
{/if}