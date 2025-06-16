<script lang="ts">
    import { createBubbler, stopPropagation } from 'svelte/legacy';

    const bubble = createBubbler();


    interface Props {
        value?: string;
        placeholder?: string;
        accept?: string | undefined;
        id?: string;
        name?: string;
        required?: boolean;
        label?: string | undefined;
        style?: string;
        class?: string;
        children?: import('svelte').Snippet;
    }

    let {
        value = $bindable(''),
        placeholder = 'Files',
        accept = undefined,
        id = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16),
        name = id,
        required = false,
        label = 'Browse file',
        style = '',
        class: className = 'button',
        children
    }: Props = $props();
    
</script>



<label class="styled-file {className}" for={id}>
    <input type="file" {id} {name} class={className} {accept} bind:value {placeholder} {required} {style} onclick={stopPropagation(bubble('click'))} 
        onchange={bubble('change')} onblur={bubble('blur')} onfocus={bubble('focus')} onkeypress={bubble('keypress')}/>
        {#if (children || label)}
            {#if children}
                {@render children?.()}
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