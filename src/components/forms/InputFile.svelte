<script lang="ts">
    export let value: string = '';
    export let placeholder: string = 'Files';
    export let accept: string | undefined = undefined;

    export let id: string = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    export let name: string = id;
    export let required: boolean = false;
    export let label: string | undefined = 'Browse file';
    export let style: string = '';

    let className: string = 'button';
    export {
        className as class
    }
</script>



<label class="styled-file {className}" for={id}>
    <input type="file" {id} {name} class={className} {accept} bind:value {placeholder} {required} {style} on:click|stopPropagation 
        on:change on:blur on:focus on:keypress/>
        {#if ($$slots.default || label)}
            {#if $$slots.default}
                <slot/>
            {:else}
                {label}
            {/if}
        {/if}
</label>

<style>

.styled-file {

}
.styled-file input[type="file"] {
    display: none;
}
</style>