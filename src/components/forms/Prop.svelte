<script lang="ts">
    export let value: string | number | undefined = undefined;
    export let href: string | undefined = undefined;
    export let icon: string | undefined = undefined;
    export let label: string | undefined = undefined;

    const SLOTS = $$props.$$slots || {};

</script>

{#if (value !== undefined && value !== null) || SLOTS.value}
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
                <slot />
            {/if}
        </div>
        <div class="prop-value">
        {#if href !== undefined}
            <a {href} class="a">
                {#if SLOTS.value}
                    <slot name="value" />
               {:else}
                    {value}
                {/if}</a>
        {:else}
            {#if SLOTS.value}
                <slot name="value" />
            {:else}
                {value}
            {/if}
        {/if}
        </div>
        {#if SLOTS.units}
        <div class="prop-units">
            <slot name="units" />
        </div>
        {/if}
    </div>
{/if}


