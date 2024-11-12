<script lang="ts">
    import Header from '$scomponents/layout/Header.svelte';
    import DropFiles from '$scomponents/import/DropFiles.svelte';   
    import Modal from '$scomponents/ui/Modal.svelte';
    import HealthForm from '../profile/HealthForm.svelte';
    import Import from '$scomponents/import/Index.svelte';
    import ui from '$slib/ui';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { beforeNavigate } from '$app/navigation';
    import { Overlay, state } from '$slib/ui';
    import shortcuts from '$slib/shortcuts';

    const dialogs = {
        healthForm: false
    };


    // close all dialogs on navigation
    beforeNavigate(() => {
        $state.overlay = Overlay.none;
    });

    onMount(() => {
        console.log('UI mounted');
        const offs = [
            ui.listen('modal.healthForm', (config: any) => {
                console.log('modal.healthForm', config);
                dialogs.healthForm = config || true;
            }),
            ui.listen('overlay.import', () => {
                console.log('import');
                $state.overlay = Overlay.import;
            }),
            shortcuts.listen('Escape', () => {
                $state.overlay = Overlay.none;
            })
        ]

        return () => {
            offs.forEach(off => off());
        }

    });

</script>
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
