<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { setClient } from '$lib/supabase';
	import '../css/index.css';

	let { data, children } = $props();
	
	// Break reactive loop: use $derived.by to avoid self-reference
	let session = $derived(data?.session || null);
	let supabase = $derived(data?.supabase);

	onMount(() => {
		if (!supabase) return;
		
		const authListener = supabase.auth.onAuthStateChange(() => {
			// Always invalidate on auth state change to be safe
			invalidate('supabase:auth');
		});

		return () => authListener.data.subscription.unsubscribe();
	});

	// Keep existing setClient call for compatibility
	setClient(supabase);
</script>

{@render children()}