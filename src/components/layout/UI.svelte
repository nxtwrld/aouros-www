<script lang="ts">
    import Header from '$scomponents/layout/Header.svelte';
    import DropFiles from '$scomponents/import/DropFiles.svelte';   
    import Modal from '$scomponents/ui/Modal.svelte';
    import HealthForm from '../profile/HealthForm.svelte';
    import ui from '$slib/ui';
    import { onMount } from 'svelte';
    const dialogs = {
        healthForm: false
    };



    onMount(() => {
        const offs = [
            ui.listen('modal.healthForm', (config: any) => {
                console.log('modal.healthForm', config);
                dialogs.healthForm = config || true;
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
</DropFiles>

{#if dialogs.healthForm}
    <Modal on:close={() => dialogs.healthForm = false}>
        <HealthForm config={dialogs.healthForm}  on:abort={() => dialogs.healthForm = false}/>
    </Modal>
{/if}
