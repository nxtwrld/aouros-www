<script lang="ts">
    import Prop from "./Prop.svelte";
    import { importPublicKeySpki } from '$lib/encryption/rsa';

    export let placeholder: string = '';
    export let id: string = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    export let name: string = id;
    export let required: boolean = false;
    export let label: string | undefined = undefined;
    export let value = '';


    let key: CryptoKey | undefined;
    let error: string | undefined;


    $: {
        if (value !== '') {
            console.log('importing key')
            importKey(value).then((k) => {
                if (k) {
                    key = k;
                    error = undefined;
                }
            })
            .catch((e) => {
                error = e?.message || "Invalid Key format";
            })
        }
    }


    async function importKey(pem: string) {
        return importPublicKeySpki(pem);
    }



</script>

{#if label !== undefined}
<label for={id} class="label">{label}</label>
{/if}
{#if $$slots.default}
    <label for={id} class="label"><slot/></label>

{/if}

<div class="input" class:-error={error}>
    <textarea
        bind:value={value}
        invalid="This is not a valid RSA-OAEP Public key" 
        {id} {required} {name} {placeholder}></textarea>

    <div class="details">
        {#if error !== undefined}
            <p class="error">Failed to parse the Public. Please, provide a valid public key</p>
        {:else if key !== undefined}
            <Prop value={key.type} >Key Type</Prop>
            <Prop value={key.algorithm.name} >Algorithm</Prop>
            <Prop value={key.algorithm?.hash.name} >HASH</Prop>
            <Prop value={key.usages.join(', ')} >Usages</Prop>
        {/if}
    </div>

</div>

<style>
    .input {
        display: flex;
        flex-direction: row;
        align-items: stretch;
        justify-content: space-between;
    }
    textarea {
        width: auto;
        flex-grow: 1;
        height: auto;
        resize: none;
        border: none;
        outline: none;
        background: transparent;
        color: inherit;
        font-size: inherit;
        padding: 0.5rem;
        box-sizing: border-box;
    }
    .details {
        padding: 0.5rem;
        min-width: 20rem;
        box-sizing: border-box;
    }
    .error {
        color: red;
    }
</style>
