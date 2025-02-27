<script lang="ts">
	import { onMount } from "svelte";

    export let value: string;
    export let placeholder: string = '';
    export let resizable: boolean = true;
    export let id: string = (window as any)?.crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    export let name: string = id;
    export let required: boolean = false;
    export let label: string | undefined = undefined;
    export let focus: boolean = false;
    export let size: number = 1;

    let className: string = 'textarea';
    let oldValue = value;
    export {
        className as class
    }

    let element: HTMLTextAreaElement;
    function keydown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
        sizeTextarea();
    }

    $: {
        if (oldValue !== value) {
            sizeTextarea();
            oldValue = value;
        }
        
    }

    function sizeTextarea()  {
        if (!resizable) return;
        setTimeout(function(){
            if (!element) return;
            element.style.height = 'auto';    
            element.style.height =  'max(' + (Math.max(element.scrollHeight || 300)) + 'px,' +(3 + size*1.5) +'em)';
        },0);
    }


    onMount(() => {
        sizeTextarea();
        if (focus) element.focus();
    })


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

<textarea bind:this={element} bind:value={value} {id} {name} {placeholder} class={className} on:keydown={keydown} on:change {required}></textarea>

<style>


</style>