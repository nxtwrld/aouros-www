<script lang="ts">

    export let tips: string[] = [];
    export let icon: string = 'tips';

</script>
{#if tips.length > 0}
<div class="tips">
<svg>
    <use href="/sprite.svg#{icon}"></use>
</svg>

<div class="tips-list">
    <h3><slot /></h3>
    <ul>
        {#each tips as tip}
            <li>{tip}</li>
        {/each}
    </ul>
</div>          
</div>
{/if}

<style>
    .tips {
        display: flex;
        margin: 1rem;
        align-items: center;
    }
    .tips svg {
        fill: currentColor;
        height: 5rem;
        width: 5rem;
        margin-right: 1rem;
    }
    ul {
        margin: 1rem;
        list-style:disc
    }
    li {
        margin: .5rem 0 0 1rem ;
    }
</style>