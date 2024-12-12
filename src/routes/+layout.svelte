<script>
	import { goto, invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { setClient } from '$lib/supabase';
	import '../css/index.css';

	export let data;
	//$: ({ session, supabase } = data);



	onMount(() => {
		setClient(supabase);
		
		const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
			console.log('supabase:auth change', newSession);
			if (newSession?.expires_at !== session?.expires_at) {
				console.log('supabase:auth expired', newSession);
				invalidate('supabase:auth')
				goto('/auth', { replaceState: true });
			}
		})
		return () => data.subscription.unsubscribe();
	});
</script>

<slot />