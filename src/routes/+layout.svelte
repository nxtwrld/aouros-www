<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../css/app.css';
	import '../css/index.css';

	let { data, children } = $props();
	
	// Break reactive loop: use $derived.by to avoid self-reference
	let session = $derived(data?.session || null);
	let supabase = $derived(data?.supabase);

	onMount(() => {
		const currentSupabase = data?.supabase;
		if (!currentSupabase) return;
		
		let lastUserId: string | null = data?.session?.user?.id || null;
		let invalidateScheduled = false;

		const authListener = currentSupabase.auth.onAuthStateChange((event, sessionData) => {
			const newUserId = sessionData?.user?.id || null;
			const isSignIn = event === 'SIGNED_IN';
			const isSignOut = event === 'SIGNED_OUT';
			const isUserUpdated = event === 'USER_UPDATED';
			const userChanged = newUserId !== lastUserId;

			if ((isSignIn || isSignOut || isUserUpdated) && userChanged) {
				lastUserId = newUserId;
				if (!invalidateScheduled) {
					invalidateScheduled = true;
					queueMicrotask(() => {
						invalidate('supabase:auth');
						invalidateScheduled = false;
					});
				}
			}
		});

		return () => authListener.data.subscription.unsubscribe();
	});
</script>

{@render children()}