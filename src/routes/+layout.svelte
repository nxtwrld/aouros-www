<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { setClient, getClient } from '$lib/supabase';
	import '../css/index.css';

	let { data, children } = $props();
	
	// Break reactive loop: use $derived.by to avoid self-reference
	let session = $derived(data?.session || null);
	let supabase = $derived(data?.supabase);

	onMount(() => {
		const currentSupabase = data?.supabase;
		if (!currentSupabase) return;
		
		const authListener = currentSupabase.auth.onAuthStateChange((event, sessionData) => {
			// Only invalidate on actual auth changes, not initial load
			if (event !== 'INITIAL_SESSION') {
				invalidate('supabase:auth');
			}
		});

		return () => authListener.data.subscription.unsubscribe();
	});

	// Set client for compatibility - now handles re-initialization gracefully
	setClient(supabase);
</script>

{@render children()}