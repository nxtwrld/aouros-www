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
    <div>
        <img src="/icon.svg" alt="aouros logo" />

        <h1>AOUROS</h1>
        <h2>quantified curiosity</h2>
        <!--h2>query cure</h2-->
    </div>
</div>


<style>
    :global(html), :global(body) {
        margin: 0;
        padding: 0;
        height: 100%;
        background-color: var(--color-primary);
        background-image: none;
        font-family: "Mulish", sans-serif;
        font-optical-sizing: auto;
    }

    .placer {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
    }
    img {
        width: 20vh;
        max-width: 20vh;
        max-height: 20vh;
        aspect-ratio: 1/1;
        margin-left: -10%;
    }
    h1 {
        font-size: 4rem;
        color: var(--color-white);
        font-weight: 400;
        margin: 1rem 0 1rem;
        font-family: "Montserrat", sans-serif;
        font-optical-sizing: auto;
    }
    h2 {
        font-size: 2.5rem;
        color: var(--color-white);
        font-weight: 405;
        margin-top: 1rem;
        font-family: "Montserrat", sans-serif;
        font-optical-sizing: auto;
    }
</style>