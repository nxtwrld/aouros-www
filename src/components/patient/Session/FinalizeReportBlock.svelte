<script lang="ts">
    import { onMount } from 'svelte';

    export let value: string;
    export let focus: boolean = false;
    export let size: number = 1;

    let element: HTMLTextAreaElement;

    let oldValue = value;

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
        setTimeout(function(){
            if (!element) return;
            element.style.height = 'auto';    
            element.style.height =  'max(' + (Math.max(element.scrollHeight || 300)) + 'px,' +(3 + size*1.5) +'em)';
        }, 0);
    }


    onMount(() => {
        sizeTextarea();
        if (focus) element.focus();
    })

</script>


<div class="block block-findings">
    <textarea bind:this={element} class="editable" bind:value={value} />
</div>


<style>

    .block {
        margin: 0;
        
    }
    textarea {
        width: 100%;
        padding: 1rem;
        border: none;
        line-height: 1.3rem;
        resize: none;
    }
</style>