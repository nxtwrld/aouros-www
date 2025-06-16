<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        value?: string | number | undefined;
        href?: string | undefined;
        icon?: string | undefined;
        label?: string | undefined;
        children?: Snippet;
        valueSlot?: Snippet;
        units?: Snippet;
    }

    let { value = undefined, href = undefined, icon = undefined, label = undefined, children, valueSlot, units }: Props = $props();

</script>

{#if (value !== undefined && value !== null) || valueSlot}
    <div class="prop-row" class:-icon={icon}>
        {#if icon}
        <div class="prop-icon">
            <svg>
                <use href="/sprite.svg#{icon}" />
            </svg>
        </div>
        {/if}
            

        <div class="prop-label">
            {#if label}
                {label}
            {:else}
                {@render children?.()}
            {/if}
        </div>
        <div class="prop-value">
        {#if href !== undefined}
            <a {href} class="a">
                {#if valueSlot}
                    {@render valueSlot()}
               {:else}
                    {value}
                {/if}</a>
        {:else}
            {#if valueSlot}
                {@render valueSlot()}
            {:else}
                {value}
            {/if}
        {/if}
        </div>
        {#if units}
        <div class="prop-units">
            {@render units()}
        </div>
        {/if}
    </div>
{/if}


