<script lang="ts">
    import { fade } from "svelte/transition";
    import user from '$slib/user';

    let passphrase = '';

    $: unlocked = $user && $user.unlocked;
    $: email = $user?.email ?? '';

    let error: string = '';

    async function unlock () {
        error = '';
        if (passphrase == '') {
            error = 'Passphrase is required';
            return;
        }
        if ($user) {
            console.log('unlocking');
            const unlocked = await user.unlock(passphrase);
            if (!unlocked) {
                error = 'Invalid passphrase';
             } else {
                passphrase = '';
             }

        }
    }


</script>

{#if unlocked}

<slot/>
{:else}
<div class="overlay" transition:fade>
    <div class="flex -center">
        <div class="form">
            <h2 class="h2">Unlock</h2>
            {#if error}{error}{/if}
            <form on:submit|preventDefault={unlock} autocomplete="on">
                <div class="input -none">
                    <input type="text" name="email" id="email" value={email} placeholder="Email" autocomplete="email" />
                </div>
                <div class="input">
                    <input type="password" name="password" id="password" bind:value={passphrase} placeholder="Passphrase" autocomplete="current-password" />
                </div>
                <div class="form-actions">
                    <button class="button -primary" >Unlock</button>
                </div>
            </form>
        </div>
    </div>
</div>
{/if}


<style>



</style>