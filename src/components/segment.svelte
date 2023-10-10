<div class="segment">
    <div class="page">
        <slot />
    </div>
</div>

<style>
    .segment {
        position: relative;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        min-height: 20vh;
        padding: 1rem;
        width: 110%;
        overflow: hidden;
        transform: rotate(-2deg) translateX(-5%);
        -webkit-mask-image: -webkit-radial-gradient(white, black);
    }

    .segment:nth-child(odd) {
        background-color: var(--color-primary-lighter);
    }
    .segment .page {
        transform: rotate(2deg);
    }
    .segment:nth-child(odd) .page :global(> *) {
        margin-right: 50%;
        padding: 0 3rem;
    }

    .segment:nth-child(even) {
        text-align: right;
    }

    .segment:nth-child(even) .page :global(> *) {
        margin-left: 50%;
        padding: 0 3rem;
    }

    .segment .page :global(img) {
        width: 100%;
        height: auto;
        position: absolute;
        left: 0;
        top: 0;
        width: 50%;
    }

    .segment:nth-child(even)  .page :global(img) {
        transform: rotate(2deg) translate(-100%, -25%);
    }
    .segment:nth-child(odd)  .page :global(img) {
        transform: rotate(2deg) translate(100%, -25%);
    }
</style>