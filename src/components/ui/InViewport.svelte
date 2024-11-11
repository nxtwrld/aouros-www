<script lang="ts">
    import type { ComponentType } from 'svelte';

    export let isIntersecting: boolean = false;
    export let clearOnExit: boolean = false;
    export let component: ComponentType | undefined = undefined;
    export let props: any = {};

    let intersectionObserver : IntersectionObserver | null = null;

    function ensureIntersectionObserver() {
        if (intersectionObserver) return;

    intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const eventName = entry.isIntersecting ? 'enterViewport' : 'exitViewport';
                    entry.target.dispatchEvent(new CustomEvent(eventName));
                });
            }
        );
    }

    function viewport(element) {
        ensureIntersectionObserver();

        intersectionObserver.observe(element);

        return {
            destroy() {
                intersectionObserver.unobserve(element);
                //intersectionObserver.disconnect();
                intersectionObserver = null;
            }
        }
    }


    function enter() {
        isIntersecting = true;
    }
    function exit() {
        if (clearOnExit) isIntersecting = false;
    }

</script>

<div use:viewport on:enterViewport={enter} on:exitViewport={exit}>
    {#if isIntersecting}
        {#if component}
            <svelte:component this={component} {...props} />
        {:else}
            <slot />
        {/if}
    {/if}
</div>