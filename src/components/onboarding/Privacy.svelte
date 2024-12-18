<script lang="ts">
	import { passwordStrength } from 'check-password-strength';
    import { prepareKeys } from '$lib/encryption/rsa';
    import { createHash } from '$lib/encryption/hash';
    import { generatePassphrase } from '$lib/encryption/passphrase';
    import { onMount } from 'svelte';
    import { t } from '$lib/i18n';
    

    export const ready: boolean = true;
    export let data: {
        bio: {
            email: string;
        }
        privacy: {
            enabled: boolean;
            key_hash?: string;
            privateKey?: string;
            publicKey?: string;
            passphrase?: string;
        };
    };

    let passphrase = generatePassphrase();
    let testPassphrase: string = '';
    let automaticSavingCapable: boolean = false;

    $: strength = passwordStrength(passphrase).value;



    export let profileForm: HTMLFormElement;

    let autoPassphrase: 'settingup' | 'create' | 'custom' |  'test' | 'success' | 'fail' = (data.privacy.enabled && data.privacy.privateKey && data.privacy.publicKey) ? 'success' :  'settingup';
    let testPassphraseElement: HTMLInputElement | undefined = undefined;

    let isCustomPassphrase: boolean = false;
    let viewPassphrase: boolean = false;

    async function setPassphrase() {
        console.log('setPassphrase', passphrase);

        const passwordCredential = new PasswordCredential({ id: data.bio.email, password: passphrase });
        await navigator.credentials.store(passwordCredential);

        setTimeout(() => {
                  autoPassphrase = 'test';
        }, 100);
    }

    async function setAutomaticPassword() {
        await setKeys();
        //passphrase = generatePassphrase();
        autoPassphrase = 'create';
        isCustomPassphrase = false;
    }
    async function setCustomPassword() {
        await setKeys();
        passphrase = '';
        autoPassphrase = 'custom';
        isCustomPassphrase = true;
    }

    async function setKeys(privateKey: string | undefined = undefined, publicKey: string | undefined = undefined, key_hash: string | undefined = undefined) : Promise<void> {
        if (!privateKey || !publicKey || !key_hash) {
            passphrase = generatePassphrase();
            let keys = await prepareKeys(passphrase);
            let key_hash = await createHash(passphrase);
            return await setKeys(keys.encryptedPrivateKey, keys.publicKeyPEM, key_hash);
        } 
        data.privacy.key_hash = key_hash;
        data.privacy.privateKey = privateKey;
        data.privacy.publicKey = publicKey;

        if (data.privacy.enabled) {
            data.privacy.passphrase = undefined;
        } else {
            data.privacy.passphrase = passphrase;
        }
        return;
    }


    async function checkPassphrase() {
        let credentials = await navigator.credentials.get({ password: true });
        testPassphrase = '';
        if (credentials) {
            testPassphrase = credentials.password;
        }


        if (testPassphrase === passphrase) {
            let keys = await prepareKeys(testPassphrase);
            let key_hash = await createHash(passphrase);
            await setKeys(keys.encryptedPrivateKey, keys.publicKeyPEM, key_hash);
            autoPassphrase = 'success';

        }
        testPassphrase = '';
    }

    function resetAutomaticPassword() {
        passphrase = '';
        autoPassphrase = automaticSavingCapable ? 'create' : 'custom';
    }

    async function ignorePasswordManager() {
        let keys = await prepareKeys(passphrase);
        let key_hash = await createHash(passphrase);
        await setKeys(keys.encryptedPrivateKey, keys.publicKeyPEM, key_hash);
        autoPassphrase = 'success';
    }

    async function resetAll() {
        console.log('resetAll');
        await setKeys();
        autoPassphrase = automaticSavingCapable ? 'create' : 'custom';
        passphrase = generatePassphrase();
        testPassphrase = '';
        
    }

    function clickedToCopy(e: PointerEvent) {
        const target = e?.target as HTMLInputElement;
        target.select();
        navigator.clipboard.writeText(passphrase); 
    }

    onMount(async () => {
        await navigator.credentials.preventSilentAccess();
        automaticSavingCapable = (window?.PasswordCredential) ? true : false;
        if (!automaticSavingCapable)  {
            autoPassphrase = 'custom';
        } else {
            autoPassphrase = 'create';
        }
        await setKeys();
    });

    async function forceKeySetup() {

        if (data.privacy.enabled) {
            await resetAll();
            autoPassphrase = automaticSavingCapable ? 'create' : 'custom';
        } else {
            await resetAll();
        }
    }
</script>



<h2 class="h2">{ $t('app.onboarding.privacy-and-amp-encryption') } ({ $t('app.onboarding.optional') })</h2>

<div class="input">
    <input type="checkbox" id="enabled" bind:checked={data.privacy.enabled} on:click={forceKeySetup} />
    <label for="enabled">{ $t('app.onboarding.enable-total-privacy') }</label>
</div>


{#if !data.privacy.enabled}
    <p class="p form-message">{ $t('app.onboarding.your-data-are-currently-stored-securely-on-our-backend-in-encrypted-form') }</p>
    <p class="p form-message">
        <svg>
            <use href="/icons-o.svg#encrypt" />
        </svg>
        { $t('app.onboarding.total-privacy-lets-you-add-another-layer-of-privacy-by-encrypt-all-your-data-with-a-custom-passphrase-that-even-the-serv') }</p>
    <p class="p form-message -warning">{ $t('app.onboarding.if-you-loose-this-passphrase-it-can-never-be-recovered-and-all-your-data-will-be-lost-we-suggest-to-keep-it-in-password-') }</p>
{:else}
    <!--div class="input">
        <label for="privateKey">Private key</label>
        <input id="privateKey" type="text" bind:value={data.privacy.privateKey} />
    </div>
    <div class="input">
        <label for="publicKey">Public key</label>
        <input id="publicKey" type="text" bind:value={data.privacy.publicKey} />
    </div-->
    {#if autoPassphrase == 'create'}

            <div class="flex -center -column">
                <button class="button -large" on:click={setPassphrase}>{ $t('app.onboarding.set-passphrase') }</button>
            </div>
            
                <p class="p  form-message">Click <strong>Set Passphrase</strong> and follow the instructions given by your system.</p>

                {#if viewPassphrase}
                <div class="input">
                    <input type="text" bind:value={passphrase} on:focus={clickedToCopy} />

                </div>
                <p class="p"><button class="a" on:click={() => navigator.clipboard.writeText(passphrase)}>{ $t('app.onboarding.copy-to-clipboard') }</button> { $t('app.onboarding.or') } <button class="a" type="button" on:click={() => viewPassphrase = false}>{ $t('app.onboarding.hide-passphrase') }</button></p>
                <p class="p"><button class="a" on:click={ignorePasswordManager}>{ $t('app.onboarding.i-stored-or-remembered-the-passphrase-myself') }</button></p>
                {:else}
                <p class="p"><button class="a" on:click={() => viewPassphrase = true}>{ $t('app.onboarding.view-passphrase') }</button></p>
                {/if}
                <p class="p">{ $t('app.onboarding.to-set-your-own-custom-passphrase') }<button class="a" on:click={setCustomPassword}>{ $t('app.onboarding.click-here') }</button></p>


    {:else if autoPassphrase == 'custom'}
        <form method="POST" name="login" on:submit|preventDefault>
            <div class="automatic-passphrase">
            <input type="text" name="username" autocomplete="username" value={data.bio.email} />

            </div>
            <div class="input">
                <input type="password" name="password" autocomplete="new-password" bind:value={passphrase} on:click={clickedToCopy} />
            </div>
            <p class="p">{strength}</p>
            {#if automaticSavingCapable}
            <div class="flex -center -column">
            
                    <button class="button -large" type="submit" on:click={setPassphrase}>{ $t('app.onboarding.set-passphrase') }</button>

                    {#if isCustomPassphrase}
                    <button class="a" on:click={ignorePasswordManager}>{ $t('app.onboarding.privacy.i-dont-need-to-store-it') }</button>
                    {/if}

            </div>
                <p class="p  form-message">Click <strong>Set Passphrase</strong> and follow the instructions given by your system.</p>
                <p class="p">{ $t('app.onboarding.privacy.to-generate-a-random-passphrase') } <button class="a" on:click={setAutomaticPassword}>{ $t('click-here') }.</button></p>
            {:else}
            <p class="p form-message">{ $t('app.onboarding.privacy.store-this-password-securely') } <button class="a" on:click={() => navigator.clipboard.writeText(passphrase)}>{ $t('app.onboarding.copy-to-clipboard') }</button></p>
            <button class="button -large" on:click={ignorePasswordManager}>{ $t('app.onboarding.privacy.i-have-it-stored') }</button>
            {/if}
        </form>
    {:else if autoPassphrase == 'test'}
        <button class="button -large" on:click={checkPassphrase}>{ $t('app.onboarding.privacy.check-saved-passphrase') }</button>
        <p class="p  form-message">Click <strong>Check passphrase</strong> and authenticate password from your system to confirm saving</p>
    {:else if autoPassphrase == 'success'}
        <p class="p form-message -success">{ $t('app.onboarding.privacy.passphrase-is-saved-in-password-manager') }</p>
        <p class="p form-message">{ $t('app.onboarding.privacy.your-total-privacy-is-configured') } <button class="a" on:click={resetAll}>{ $t('app.onboarding.privacy.configure-again') }</button></p>
    {:else if autoPassphrase == 'fail'}
        <p class="p form-message -fail">{ $t('app.onboarding.privacy.passphrase-is-not-saved-in-password-manager') }</p>

        <div class="flex -center">
            <button class="button" on:click={resetAutomaticPassword}>{ $t('app.onboarding.privacy.try-again') }</button>
        </div>
    {/if}

    {#if autoPassphrase != 'success'}
    <p class="p form-message -warning">{ $t('app.onboarding.privacy.your-passphrase-is-not-yet-set') }</p>
    {/if}

{/if}


<style>

    .automatic-passphrase {
        position: fixed;
        top: -100000000px;
        left: -100000000px;
    }

    .button.-large {
        width: 100%;
    }
    input[type=password].button {
        caret-color: transparent;
        color: transparent;
        cursor: pointer;

    }
    input[type=password].button::placeholder {
        text-align: center;
        color: var(--color-text);
    }
 
</style>