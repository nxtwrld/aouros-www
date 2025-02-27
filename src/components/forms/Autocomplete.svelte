<script lang="ts">
    import Autocomplete from 'simple-svelte-autocomplete';
    import { createEventDispatcher } from 'svelte';
    import type { SelectOptions } from './Select.svelte';

    const dispatch = createEventDispatcher();

    export let value: string;
    export let label: string | undefined = undefined;
    export let placeholder: string = 'Select';
    export let options: SelectOptions = [];
    export let required: boolean = false;
    export let bindValue: boolean = false;
    export let id: string = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    export let name: string = id;  
    let className: string = 'input';
    export {
        className as class
    }

</script>

{#if $$slots.default || label}
<label class="label" for={id}>
    {#if label}
        {label}
    {:else}
        <slot/>
    {/if}
</label>
{/if}
<span>


    <Autocomplete inputId={id} {name} valueFieldName="key" labelFieldName="value" {className}  items={options} 
        bind:value={value}  {placeholder} {required} noResultsText="Custom" noInputStyles={true}
        onBlur={() => dispatch('blur')} onChange={() => dispatch('change')} onFocus={() => dispatch('focus')} 
    >
        <span slot="no-results">No results</span>
        <span slot="loading">Loading</span>

    </Autocomplete>

</span>

<style>

    span :global(.autocomplete) {
        width: 100%;
    }
    span :global(.autocomplete:after) {
        border-color: inherit !important;
    }
    span :global(.autocomplete.input) {
        padding: 0 !important;
        font-size: 1.1rem !important;
    }
    span :global(.autocomplete input) {
        width: 100% !important;
        margin: 0 !important;
        padding: .5rem !important;
        font-size: 1.1rem !important;
        background-color: transparent !important;
        border: none !important;
        color: inherit !important;
    }
    span :global(.autocomplete:not(.hide-arrow):not(.is-loading)::after) {

        --size: .3rem;
        color: inherit  !important;
        border-color: #000 !important;
        border-width: 2.5px !important;
        top: calc(50% + var(--size)) !important;
        right: .8em  !important;
        width: var(--size) !important;
        height: var(--size) !important;
    }
</style>