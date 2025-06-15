<script lang="ts">
    import Header from '$components/layout/Header.svelte';
    import DropFiles from '$components/import/DropFiles.svelte';   
    import Modal from '$components/ui/Modal.svelte';
    import HealthForm from '../profile/HealthForm.svelte';
    import HealthProperty from '../healthProperty/Overview.svelte';
    import Import from '$components/import/Index.svelte';
    import ui from '$lib/ui';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { beforeNavigate, afterNavigate } from '$app/navigation';
    import { Overlay, state as uiState } from '$lib/ui';
    import shortcuts from '$lib/shortcuts';
    import Sounds from '$components/ui/Sounds.svelte';
    import Viewer from './Viewer.svelte';

    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();

    // Fixed: Convert to proper Svelte 5 reactive state
    let dialogs = $state({
        healthForm: false,
        healthProperty: false
    });


    // close all dialogs on navigation
    afterNavigate(() => {
        manageOverlay();
    });

    function manageOverlay() {
        if (location.hash.indexOf('#overlay-') == 0) {
            const overlay = location.hash.replace('#overlay-', '');
            if (Object.values(Overlay).includes(overlay as Overlay)) $uiState.overlay = overlay as Overlay;
        } else {
            $uiState.overlay = Overlay.none;
        }
    }

    onMount(() => {
        console.log('UI mounted');
        const offs = [
            ui.listen('modal.healthProperty', (config: any) => {
                console.log('modal.healthProperty', config);
                dialogs.healthProperty = config || true;
            }),
            ui.listen('modal.healthForm', (config: any) => {
                console.log('modal.healthForm', config);
                dialogs.healthForm = config || true;
            }),
            ui.listen('overlay.import', (state: boolean = true) => {
                console.log('import');
                if (state == true) location.hash = '#overlay-import';
                else  {
                    if (location.hash.indexOf('#overlay-') == 0) {
                    history.back();
                }
                }
                //$state.overlay = Overlay.import;
            }),
            ui.listen('viewer', (config: any) => {
                $uiState.viewer = true;
                //$uiState.overlay = Overlay.none;
            }),
            shortcuts.listen('Escape', () => {
                if (location.hash.indexOf('#overlay-') == 0) {
                    history.back();
                }
                //$state.overlay = Overlay.none;
            })
        ]

        manageOverlay();
        return () => {
            offs.forEach(off => off());
        }

    });

</script>
<svelte:window on:hashchange={manageOverlay} />

<DropFiles>
    <Header></Header>
    <main class="layout" class:-viewer={$uiState.viewer}>
        {#if $uiState.viewer}
            <section class="layout-viewer" transition:fade><Viewer /></section>
        {/if}
        <section class="layout-content">{@render children()}</section>
    </main>


    {#if $uiState.overlay == Overlay.import}
        <div class="virtual-page" transition:fade>
            <Import />
            </div>
    {/if}

    {#if dialogs.healthForm}
        <Modal on:close={() => dialogs.healthForm = false}>
            <HealthForm config={dialogs.healthForm}  on:abort={() => dialogs.healthForm = false}/>
        </Modal>
    {/if}
    {#if dialogs.healthProperty}
        <Modal on:close={() => dialogs.healthProperty = false}>
            <HealthProperty property={dialogs.healthProperty}  on:abort={() => dialogs.healthProperty = false}/>
        </Modal>
    {/if}

</DropFiles>
<Sounds />
<style>
    .virtual-page {
        position: fixed;
        top: calc(var(--toolbar-height) + var(--gap));
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100000;
        background: var(--background);
    }
</style>
