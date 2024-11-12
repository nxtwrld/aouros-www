<script lang="ts">
    import { fade } from "svelte/transition";
    import user from '$lib/user';
    import Loading from "$components/ui/Loading.svelte";
    import { t } from '$lib/i18n';
    let passphrase = '';

    $: unlocked = $user && $user.unlocked;
    $: email = $user?.email ?? '';

    let error: string = '';

    async function unlock () {
        error = '';
        if (passphrase == '') {
            error = $t('app.unlock.passphrase-is-required');
            return;
        }
        if ($user) {
            console.log('unlocking');
            const unlocked = await user.unlock(passphrase);
            if (!unlocked) {
                error = $t('app.unlock.invalid-passphrase');
             } else {
                passphrase = '';
             }

        }
    }


</script>

{#if unlocked}

<slot/>
{:else}
    {#if unlocked === false}
        <div class="overlay" transition:fade>
            <div class="flex -center">
                <div class="form">
                    <h2 class="h2">{ $t('app.unlock.unlock') }</h2>
                    {#if error}{error}{/if}
                    <form on:submit|preventDefault={unlock} autocomplete="on">
                        <div class="input -none">
                            <input type="text" name="email" id="email" value={email} placeholder="Email" autocomplete="email" />
                        </div>
                        <div class="input">
                            <input type="password" name="password" id="password" bind:value={passphrase} placeholder={ $t('app.unlock.passphrase') } autocomplete="current-password" />
                        </div>
                        <div class="form-actions">
                            <button class="button -primary" >{ $t('app.unlock.unlock') }</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    {:else}
        <Loading/>
    {/if}
{/if}


<style>



</style>