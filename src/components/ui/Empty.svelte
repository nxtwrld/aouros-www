<script lang="ts">
    import { t } from '$lib/i18n';

    let className: string = '';
    export {
        className as class
    }
</script>

<div class="empty {className}">
    {#if $$slots.default}
        <slot />
    {:else}
    { $t('links.no-items') }
    {/if}
</div>


<style>
    .empty {
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--color-text-light);
        letter-spacing: .05rem;
        overflow: hidden;
        width: 100%;
        height: 100%;
        padding: .5rem 1rem;
        transition: letter-spacing .2s ease-in-out;

    }
    @media (hover: hover) {
        .empty:hover {
            letter-spacing: .1rem;
        }
    }
</style>