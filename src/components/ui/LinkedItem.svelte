<script lang="ts">
    
    export let title: string | undefined = undefined;
    export let href: string | undefined = undefined;
    export let type: string = 'link';
    export let passive: boolean = false;

    let className: string = '';
    export {
        className as class
    }

</script>

{#if passive}
    <div class="link {className} link-{type}">
        <div class="link-content">
            <slot />
        </div>

        <h4 class="link-title">
            {#if $$slots.icon}
                <div class="link-icon">
                    <slot name="icon" />
                </div>
            {:else}
                <svg class="link-icon">
                    <use href="/sprite.svg#{type}"></use>
                </svg>
            {/if}
            {title}
        </h4>
    </div>

{:else if href}
    <a {href} class="link {className} link-{type}" on:click>
        <div class="link-content">
            <slot />
        </div>

        <h4 class="link-title">
            {#if $$slots.icon}
                <div class="link-icon">
                    <slot name="icon" />
                </div>
            {:else}
                <svg class="link-icon">
                    <use href="/sprite.svg#{type}"></use>
                </svg>
            {/if}
            {#if $$slots.title}
                <slot name="title" />
            {:else}
                {title}
            {/if}
        </h4>
    </a>
{:else}
    <button class="link {className} link-{type}" on:click>
        <div class="link-content">
            <slot />
        </div>
        <h4 class="link-title">
            <svg class="link-icon">
                <use href="/sprite.svg#{type}"></use>
            </svg>
            {#if $$slots.title}
                <slot name="title" />
            {:else}
                {title}
            {/if}
        </h4>
    </button>
{/if}
<style>


    .link {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--color-shade);
        padding: 0;
        width: 100%;
        min-height: 14rem;
        height: 100%;
        cursor: pointer;
    }
    @media (hover: hover) {
        .link:hover {
            background: var(--color-primary-light);
        }
    }
    /*
    .link:hover:after {
        position: absolute;
        content: '';
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--color-primary);
        opacity: .6;
    }*/



    .link-icon {
        position: absolute;
        width: 3rem;
        height: 3rem;
        top: -3.5rem;
        right: .5rem;
        fill: #FFF;
    }
    .link-icon :global(svg) {
        fill: #FFF;
    }

    .link.preview .link-icon  {
        color: var(--color-light)
    }

    .link-details {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }
    .link-content {
        position: relative;
        width: 100%;
        height: 100%;
        opacity: .9;
        transition: opacity .2s ease-in-out;
    }
    @media (hover: none) {
        .link-content {
            opacity: 1;
        }   
    }
    .link-title {
        position: absolute;
        bottom: 0;
        left: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 4rem;
        border: 0;
        font-size: 1.1rem;
        padding: .5rem;
        text-overflow: ellipsis;
        font-weight: bold;
        text-align: center;
        background: var(--color-background-panel);
        z-index: 1;
    }
    @media (hover: hover) {
        .link:hover .link-content {
            opacity: 1;
        }
    }

/*
    .link-focus {
        background-color: #E73684;
    }
    .link-report {
        background-color: #9A67C5;
    }
    .link-doctor {
        background-color: #74C34C;
    }*/
</style>