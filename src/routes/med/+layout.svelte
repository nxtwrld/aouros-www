<script lang="ts">
    import Header from '$scomponents/Header.svelte';
    import { emitShortcut } from '$slib/shortcuts';
    import { default as userStore } from '$slib/user';

    export let data;
    let { session, supabase, user } = data

    $: {
        ({ session, supabase, user } = data);

        if (user) {
            console.log('User is logged in');
            if (user && user.email && user.id) {
                userStore.set({
                    id: user?.id,
                    email: user?.email
                })
            }
        } else {
            console.log('User is not logged in');
            userStore.set(null);
        }
    }

</script>


<svelte:window on:keypress={emitShortcut}></svelte:window>
<Header></Header>


<main>
    <slot/>
</main>