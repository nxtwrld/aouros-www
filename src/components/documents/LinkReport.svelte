<script lang="ts">
    import type { ReportLink } from "$lib/report/types.d";
    import { LinkType } from "$lib/focus/types.d";
    import { createEventDispatcher } from "svelte";
    import Modal from "$components/ui/Modal.svelte";
    import store from '$lib/report/store';
    import Label from '$components/report/ReportLabel.svelte';

    import { date } from "$lib/datetime";
	import Link from "$components/ui/Link.svelte";

    const dispatch = createEventDispatcher();


    export let data: ReportLink | undefined = undefined;

    export let showModal: boolean = false;

    let className: string = 'button';

    export {
        className as class
    }


    function linkReportForm() {
        showModal = true;

    }
    function link(item: ReportLink) {
        //console.log('Linking', item);
        if (item) dispatch('link', {
            uid: item.uid,
            type: LinkType.Report
        });
        showModal = false;
    }
</script>

<button type="button" class="{className}" on:click={linkReportForm}><slot /></button>
   




{#if showModal}
    <Modal on:close={() => showModal = false}>
        <h3 class="h3">Link Report</h3>
        <div class="list">
            {#each $store as item}
            <button on:click={() => link(item)} class="item panel">
                <div class="icon">
                    <Label type="{item.metadata.category}" />
                </div>
                <div>
                    {item.title} <br/>
                    {date(item.date)}
                </div>
            </button>
            {/each}
        </div>
        <div class="buttons-row">
            <button class="button -negative" on:click={() => showModal = false}>Cancel</button>
        </div>
    </Modal>
{/if}


<style>

.list {
    min-width: 30rem;
    display: flex;
    flex-direction: column;

    max-height: 60vh;
    overflow-y: auto;
    padding-top: 1rem;
}

.list .item {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    padding: 1rem;
    text-align: left;
}


.list .item .icon {
    margin-right: 1rem;
}

@media (hover: hover) {
    button.item:hover {
        background: var(--color-primary);
        color: var(--color-primary-contrast);
    }
}

</style>