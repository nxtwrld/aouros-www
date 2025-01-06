<script lang="ts">
    import { sharedItems } from '$lib/apps/store';
    import type { AppRecord } from '$lib/apps/types.d';

    export let data: AppRecord | undefined = undefined;


    function close() {
        sharedItems.set([]);
        history.back(-1);
    }

</script>

{#if data}
<div class="app">
        <button on:click={close} class='close'><svg>
            <use href="/sprite.svg#close" />
        </svg>
        </button>
        <iframe src="{data.connect.uri}" frameborder="0" class="app-iframe"></iframe>

</div>
{/if}
<style>
    .app {
        position: relative;
        width: 100%;
        height: calc(100vh);
        z-index: 10000000;
    }
    .app-iframe {
        width: 100%;
        height: 100%;
        border: none;
    }


    .close {
        position: absolute;
        top: var(--top-offset);
        right: 0;
        z-index: 100000000;
        background: none;
        border: none;
        padding: .5rem;
        cursor: pointer;
        width: 3rem;
        height: 3rem;
        fill: #FFF;
        background-color: rgba(0,0,0,.7);
        pointer-events: all;
    }
    .close svg {
        width: 2rem;
        height: 2rem;
    }
    @media (hover: hover) {
        .close:hover {
            background-color: rgba(0,0,0,.9);
        }
    }
    @media screen and (max-width: 768px) {
        .app {
            margin-top: calc(var(--top-offset) + var(--header-height));
            height: calc(100vh - var(--top-offset) - var(--header-height)  - var(--footer-height) - var(--bottom-offset));
        }
        .close {
            top: 0;
        }
    }

</style>
