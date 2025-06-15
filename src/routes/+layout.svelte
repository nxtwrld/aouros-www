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
		
		const authListener = supabase.auth.onAuthStateChange((event, session) => {
			// Only invalidate on actual auth changes, not initial load
			if (event !== 'INITIAL_SESSION') {
				invalidate('supabase:auth');
			}
		});

		return () => authListener.data.subscription.unsubscribe();
	});

	// Keep existing setClient call for compatibility
	setClient(supabase);
</script>

{@render children()}