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
        transform: rotate(-4deg) translateX(-5%);
        -webkit-mask-image: -webkit-radial-gradient(white, black);
    }

    .segment:nth-child(odd) {
        background-color: var(--color-primary-lighter);
        background-image: linear-gradient(150deg, var(--color-primary-light) 0%,  #ececec 30%, var(--color-primary-lighter) 100%);
    }
    .segment .page {
        transform: rotate(4deg);
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

    .segment .page > :global(img) {
        width: 100%;
        height: auto;
        position: absolute;
        left: 0;
        top: 0;
        width: 50%;
    }

    .segment:nth-child(even)  .page > :global(img) {
        transform: rotate(0deg) translate(-100%, -25%);
    }
    .segment:nth-child(odd)  .page > :global(img) {
        transform: rotate(0deg) translate(100%, -25%);
    }

    .segment .page :global(.theme) {
        width: 100%;
        height: auto;
        position: absolute;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        top: 50%;
        width: 30%;
        max-height: 70% !important;
        aspect-ratio: 1/1 !important;
        transform: translate(-50%, -50%) rotate(4deg);
        box-shadow: 3px 3px 10px rgba(0, 0, 0, .25);
    }

    .segment:nth-child(even) .page > :global(.theme) {
        left: -25%;
    }
    .segment:nth-child(odd) .page > :global(.theme) {
        left: 75%;
    }

</style>