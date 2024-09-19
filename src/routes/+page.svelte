<script lang="ts">
    
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import './www/styles.css';

	export let data;
	$: ({ countries } = data);
    //console.log(data);
    if (browser) {
     //   goto('/www');
    }
</script>

<div class="placer">
    <img src="/icon.svg" alt="aouros logo" />
</div>


<style>
    :global(html), :global(body) {
        margin: 0;
        padding: 0;
        height: 100%;
        background-color: var(--color-primary);
        background-image: none;
    }

    .placer {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
    }
    img {
        width: 40vh;
        max-width: 40vh;
        max-height: 30vh;
        aspect-ratio: 1/1;
    }
</style>