<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { t } from "svelte-i18n";
    import Modal from "./Modal.svelte";
    import { fade } from "svelte/transition";

    const dispatch = createEventDispatcher();

    export let title: string | undefined = undefined;
    export let preventer: boolean = false;

    let showPreviewDisabled = false;
    console.log(preventer)
</script>




<div class="overlay" transition:fade>
    <div class="screen-preview">


        {#if $$slots.heading}
            <slot name="heading" />
        {:else}
            <div class="heading">
                <h3 class="h3 heading">{title}</h3>
                <div class="actions">
                    <button class="-close" on:click={() => dispatch('close')}>
                        <svg>
                            <use href="/icons.svg#close" />
                        </svg>
                    </button>
                </div>
            </div>
        {/if}

        <div class="page -empty">
            <div class="preview-container">
                <slot />

                {#if preventer}
                <button on:click={() => showPreviewDisabled = true} class="preview-preventer">
                </button>
                {/if}
            </div>
        </div>
    </div>
</div>

{#if showPreviewDisabled}
<Modal on:close={() => showPreviewDisabled = false}>
    <p class="p preview-disabled-message">{ $t('app.import.preview-disabled') }</p>
</Modal>
{/if}

<style>
.screen-preview {
    margin-left: 20vw;
}

.screen-preview > .page {
    height: calc(100vh - var(--heading-height));
}
.screen-preview .preview-container {
    position: relative;
    width: 100%;
    min-height: 100%;
    overflow: hidden;
}
.screen-preview .preview-preventer {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 11;
    cursor: not-allowed;

}

</style>