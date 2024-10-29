<script lang="ts">
    import { onMount } from "svelte";
	
    export let data;
	
    $: ({ supabase } = data);

	$: logout = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error(error);
		}
	};

    let isReady: boolean = false;

    onMount(() => {
        isReady = true;
    });
</script>
<header>
	<!--nav>
		<a href="/">Home</a>
	</nav>
	<button on:click={logout}>Logout</button-->
</header>
<main>
    {#if isReady}
        <slot/>
    {/if}
</main>



<style>
    :global(html), :global(body) {
        margin: 0;
        padding: 0;
        height: 100%;
    }
    :global(body) {

        font-family:'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif;
        font-size: 20px;
    }

</style>