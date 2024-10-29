<script>
	import { goto, invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { setClient } from '$slib/supabase';
	import './styles.css';

	export let data;
	$: ({ session, supabase, user } = data);



	onMount(() => {
		setClient(supabase);

		const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth')
			}
		})
		return () => data.subscription.unsubscribe();
	});
</script>

<slot />