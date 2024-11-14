<script lang="ts">
    import Header from '$components/layout/Header.svelte';
    import DropFiles from '$components/import/DropFiles.svelte';   
    import Modal from '$components/ui/Modal.svelte';
    import HealthForm from '../profile/HealthForm.svelte';
    import Import from '$components/import/Index.svelte';
    import ui from '$lib/ui';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { beforeNavigate, afterNavigate } from '$app/navigation';
    import { Overlay, state } from '$lib/ui';
    import shortcuts from '$lib/shortcuts';

    const dialogs = {
        healthForm: false
    };


    // close all dialogs on navigation
    afterNavigate(() => {
        manageOverlay();
    });

    function manageOverlay() {
        if (location.hash.indexOf('#overlay-') == 0) {
            const overlay = location.hash.replace('#overlay-', '');
            if (Object.values(Overlay).includes(overlay as Overlay)) $state.overlay = overlay as Overlay;
        } else {
            $state.overlay = Overlay.none;
        }
    }

    onMount(() => {
        console.log('UI mounted');
        const offs = [
            ui.listen('modal.healthForm', (config: any) => {
                console.log('modal.healthForm', config);
                dialogs.healthForm = config || true;
            }),
            ui.listen('overlay.import', () => {
                console.log('import');
                location.hash = '#overlay-import';
                //$state.overlay = Overlay.import;
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
    <main><slot/></main>


    {#if $state.overlay == Overlay.import}
        <div class="virtual-page" transition:fade>
            <Import />
            </div>
    {/if}

    {#if dialogs.healthForm}
        <Modal on:close={() => dialogs.healthForm = false}>
            <HealthForm config={dialogs.healthForm}  on:abort={() => dialogs.healthForm = false}/>
        </Modal>
    {/if}

</DropFiles>
<style>
    .virtual-page {
        position: fixed;
        top: var(--toolbar-height);
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        background: var(--background);
    }
</style>
