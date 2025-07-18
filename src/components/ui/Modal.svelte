<script lang="ts">
    import { createBubbler, stopPropagation } from 'svelte/legacy';

    const bubble = createBubbler();
    import { onMount, createEventDispatcher } from 'svelte';
    import { scale, fade } from 'svelte/transition';
    const dispatch = createEventDispatcher();

    export function closeModal() {
        console.log('Modal closeModal function called, dispatching close event');
        dispatch('close');
        console.log('Modal close event dispatched');
    }

    interface Props {
        style?: string | undefined;
        children?: import('svelte').Snippet;
    }

    let { style = undefined, children }: Props = $props();

    let showShade: boolean = $state(false);
    let modalContainer: HTMLDivElement | undefined = $state();

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            closeModal();
        }
    }

    onMount(() => {
        if (!modalContainer) return;
        
        // add the modal to end of DOM to escape the parent component's styles
        (document.getElementById('app-window') || document.body).appendChild(modalContainer);
        showShade = true;
        // focus the first focusable element
        const focusable = modalContainer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length > 0) {
            (focusable[0] as HTMLElement).focus();
        }

        // Cleanup function to remove the modal from DOM when component is destroyed
        return () => {
            if (modalContainer && modalContainer.parentNode) {
                modalContainer.parentNode.removeChild(modalContainer);
            }
        };
    });
</script>

<div class="overlay flex -center" role="dialog" aria-modal="true" tabindex="0" onmousedown={(e) => {
    // Only close if clicking directly on the overlay, not on child elements
    if (e.target === e.currentTarget) {
        closeModal();
    }
}} class:-shade={showShade}  bind:this={modalContainer} onkeydown={handleKeydown} transition:fade>
    <div class="modal-content" role="document" onclick={(e) => e.stopPropagation()} transition:scale>
        <button class="close" aria-label="Close modal" onclick={closeModal}>
            <svg>
                <use href="/icons.svg#close"></use>
            </svg>
        </button>
        <div class="modal" {style}>
            {@render children?.()}
        </div>
    </div>
</div>


<style>

    .modal-content {
        --radius: var(--radius-16);
        position: relative;
        min-width: 10rem;
        max-width: 80vw;
        max-height: 100vh;
        overflow: hidden;
        box-shadow: 0 3rem 3rem -2rem rgba(0,0,0,.4);   
    }

    @media screen and (max-width: 768px) {
        .modal-content {
            max-width: 100vw !important;
            max-height: 90vh;
            margin-top: 5vh;
        }
    }


    .modal {

        position: relative;
        padding: 1rem;
        width: 100%;
        max-width: 100vw;
        height: 100%;
        max-height: 95vh;
        overflow: auto;
        z-index: 2;
        border-radius: var(--radius);
    }
    .close {
        position: absolute;
        top: 0;
        right: 0;
        padding: .5rem;
        font-weight: bold;
        background-color: transparent;
        border-top-right-radius: var(--radius);
        border-bottom-left-radius: var(--radius);
        border: none;
        z-index: 3; 
    }
    @media (hover: hover) {
        .close:hover {
            background-color: var(--color-negative);
            color: var(--color-negative-text);
            box-shadow: var(--shadow-interactive);
            border: 1px solid var(--color-border-accent);
            border-right: none;
            border-top: none;
        }
    }
    .close svg {
        fill: currentColor;
        height: 1.5rem;
        width: 1.5rem;
    }
    .modal-content :global(.modal-action) {
        background-color: var(--color-gray-500);
        margin: 0 -.5rem;
        padding: 1rem;
        border-radius: var(--radius-16);
    }
</style>