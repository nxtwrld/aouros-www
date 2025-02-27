<script lang="ts" context="module">
    export type SelectOptions = {
        key: string;
        value: string;
    }[];
</script>
<script lang="ts">
    export let value: string | string[] | null;
    export let placeholder: string = 'Select';
    export let options: SelectOptions = [];
    export let label: string | undefined = undefined;
    export let required: boolean = false;
    export let multiple: boolean = false;
    export let size: number = options.length;
    export let tabindex: number = 0;
    export let disabled: boolean = false;

    export let id: string = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
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


{#if multiple}
    <select class={className} {tabindex} {disabled} bind:value {id} {required} multiple {size}>
        {#each options as {key, value}}
            <option value={key}>{value}</option>
        {/each}
    </select>
{:else}
    <select class={className}  {tabindex} bind:value {id} {required}>
        {#if placeholder}
            <option value="" disabled selected>{placeholder}</option>
        {/if}
        {#each options as {key, value}}
            <option value={key}>{value}</option>
        {/each}
    </select>
{/if}
