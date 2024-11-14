<script lang="ts">
	import { passwordStrength } from 'check-password-strength';
    import { prepareKeys } from '$lib/encryption/rsa';
    import { createHash } from '$lib/encryption/hash';
    import { onMount } from 'svelte';

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


    function generatePassphrase(length: number =  10): string {
        console.log('generatePassphrase', length);
        const regx = new RegExp(/\d/, "g");
        let p = window.crypto.getRandomValues(new BigUint64Array(length)).reduce(
                (prev, curr, index) => (
                    !index ? prev : prev.toString(36)
                ) + (
                    index % 2 ? curr.toString(36).toUpperCase().replace(regx, key => ".,:;-_()=*".charAt(parseInt(key))) : curr.toString(36)
                )
            , '').split('').sort(
                () => 128 - window.crypto.getRandomValues(new Uint8Array(1))[0]
            ).join('');
        return p;


    }

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



<h2 class="h2">Privacy &amp; Encryption (optional)</h2>

<div class="input">
    <input type="checkbox" id="enabled" bind:checked={data.privacy.enabled} on:click={forceKeySetup} />
    <label for="enabled">Enable total privacy</label>
</div>


{#if !data.privacy.enabled}
    <p class="p form-message">Your data are currently stored securely on our backend in encrypted form.</p>
    <p class="p form-message">
        <svg>
            <use href="/icons-o.svg#encrypt" />
        </svg>
        Total privacy lets you add another layer of privacy by encrypt all your data with a custom passphrase, that even the server does not know.</p>
    <p class="p form-message -warning">If you loose this passphrase it can never be recovered and all your data will be lost. We suggest to keep it in password manager securely</p>
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
                <button class="button -large" on:click={setPassphrase}>Set passphrase</button>
            </div>
            
                <p class="p  form-message">Click <strong>Set Passphrase</strong> and follow the instructions given by your system.</p>

                {#if viewPassphrase}
                <div class="input">
                    <input type="text" bind:value={passphrase} on:focus={clickedToCopy} />

                </div>
                <p class="p"><button class="a" on:click={() => navigator.clipboard.writeText(passphrase)}>Copy to clipboard</button> or <button class="a" type="button" on:click={() => viewPassphrase = false}>Hide passphrase.</button></p>
                <p class="p"><button class="a" on:click={ignorePasswordManager}>I stored or remembered the passphrase myself.</button></p>
                {:else}
                <p class="p"><button class="a" on:click={() => viewPassphrase = true}>View passphrase.</button></p>
                {/if}
                <p class="p">To set your own custom passphrase, <button class="a" on:click={setCustomPassword}>click here.</button></p>


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
            
                    <button class="button -large" type="submit" on:click={setPassphrase}>Set passphrase</button>

                    {#if isCustomPassphrase}
                    <button class="a" on:click={ignorePasswordManager}>I don't need to store it</button>
                    {/if}

            </div>
                <p class="p  form-message">Click <strong>Set Passphrase</strong> and follow the instructions given by your system.</p>
                <p class="p">To generate a random passphrase, <button class="a" on:click={setAutomaticPassword}>click here.</button></p>
            {:else}
            <p class="p form-message">Store this password securely. <button class="a" on:click={() => navigator.clipboard.writeText(passphrase)}>Copy to clipboard</button></p>
            <button class="button -large" on:click={ignorePasswordManager}>I have it stored!</button>
            {/if}
        </form>
    {:else if autoPassphrase == 'test'}
        <button class="button -large" on:click={checkPassphrase}>Check saved passphrase</button>
        <p class="p  form-message">Click <strong>Check passphrase</strong> and authenticate password from your system to confirm saving</p>
    {:else if autoPassphrase == 'success'}
        <p class="p form-message -success">Passphrase is saved in password manager</p>
        <p class="p form-message">Your total privacy is configured. <button class="a" on:click={resetAll}>Configure again</button></p>
    {:else if autoPassphrase == 'fail'}
        <p class="p form-message -fail">Passphrase is not saved in password manager</p>

        <div class="flex -center">
            <button class="button" on:click={resetAutomaticPassword}>Try again</button>
        </div>
    {/if}

    {#if autoPassphrase != 'success'}
    <p class="p form-message -warning">Your passphrase is not yet set.</p>
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