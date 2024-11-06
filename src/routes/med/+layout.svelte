<script lang="ts">
    import Header from '$scomponents/layout/Header.svelte';
    import { emitShortcut } from '$slib/shortcuts';
    import user, { loadUser, clearUser } from '$slib/user';
    import DropFiles from '$scomponents/import/DropFiles.svelte';   
    import Unlock from '$scomponents/layout/Unlock.svelte';
    import { setClient } from '$slib/supabase.js';
    
    export let data;

    setClient(data.supabase);

    $: {
        

        if (data.user) {
                if (!$user) loadUser();
        } else {
            console.log('no profile');
            clearUser()
        }
    }

</script>


<svelte:window on:keypress={emitShortcut}></svelte:window>

<Unlock>
    <DropFiles>
        <Header></Header>
        <main><slot/></main>
    </DropFiles>
</Unlock>