<script lang="ts">
    import apps, { sharedItems } from '$lib/apps/store';
    import { AppConnectionType, type AppConnectionType as AppConnectionTypeEnum, type AppRecord } from '$lib/apps/types.d';
    import Modal from '$components/ui/Modal.svelte';
	//import Share from '../shares/Share.svelte';
    //import { getAllLinkedItems, type Item } from "$lib/common.utils";
    import AppGet from './AppGet.svelte';
    //import type { Link } from "$lib/common.types.d";
    import './style.css';

    export let type: AppConnectionTypeEnum = AppConnectionType.Report;
    export let shared: Item | undefined = undefined;
    export let tags: string[] = [];

    let showLeavingWarning: boolean = false;
    let showShareDialog: boolean = false;

    let selectedApp: AppRecord | undefined = undefined;

    let items: Link[] = [];

    if (shared) {
        /*
        getAllLinkedItems(shared).then((itemsShared: Item[]) => {
            items = itemsShared.map(item => {
                return {
                    type: item.type,
                    title: item.data?.title || item.data?.question || item.data?.fn,
                    uid: item.data.uid
                }
            }) as Link[];
        });*/
    }





    function openApp(app: AppRecord) {
        selectedApp = app;
        showLeavingWarning = true;
        
    }

    function abort() {
        showShareDialog = false;
        showLeavingWarning = false;
        selectedApp = undefined;
        sharedItems.set([]);
    }
/*
    function confirm() {
        if(selectedApp) {
            sharedItems.set(items);
            const uid = selectedApp.uid;
            abort();
            setTimeout(() => {
                goto('/app/' + uid);
            }, 500);


        }
    }*/

    function share() {
        showShareDialog = true;
    }

    function filterApps(app: AppRecord) {
        // check if 
        if (app.requires.length > 0) {
            // check passed tags if at least one is in the requires
            //console.log(app.requires, tags)
            if (!app.requires.some(r => tags.includes(r))) return false;
        }
        return app.connections.includes(type);
    }

</script>


<div class="apps">
        {#if shared}
            <button on:click={share}>
                <svg class="app-icon">
                    <use xlink:href="/sprite.svg#share"></use>
                </svg>
                <span>Share</span>
            </button>
        {/if}

    <slot />
{#each $apps.filter(filterApps) as app}
        <button on:click={() => openApp(app)} >
            <img src={app.icon} alt={app.name} class="app-icon" />
            <span>{app.name}</span>
            <span class="app-credits">{app.credits}</span>
        </button>
{/each}



</div>

{#if showLeavingWarning && selectedApp !== undefined}
    <Modal on:close={abort}>
        <div class="window">
        <AppGet app={selectedApp} {items} on:abort={abort} />
        </div>
    </Modal>
{/if}

{#if showShareDialog && shared !== undefined}
    <Modal on:close={abort}>
        <div class="window">
            <Share on:share={abort} on:abort={abort}  {items} />
        </div>
    </Modal>
{/if}


<style>
    .apps {
        display: flex;
        flex-wrap: nowrap;
        justify-content: flex-start;
        width: 100%;
        overflow-x: auto;
        height: 7rem;
        margin-bottom: var(--gap);
        background-color: rgba(21, 21, 21, 0.7);
         }

    .apps :global(> button) {
        display: inline-block;
        width: 7rem;
        padding: 0.5rem;
        text-align: center;
        color: #FFF;
        transition: all .2s ease-in-out;
        position: relative;
    }

    .app-credits {
        position: absolute;
        border-radius: var(--border-radius);
        top: .5rem;
        right: .5rem;
        font-size: .8rem;
        background-color: var(--color-secondary);
        padding: .2rem .5rem
    }
    @media (hover: hover) {
        .apps :global(> button:hover) {
            background-color: var(--color-background-panel);
            color: black;
        }
    }


    .window {
        min-width: 20rem;
        max-width: calc(100vw - 2rem);
    }
    
</style>