<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	
	let loading = true;
	let error = '';
	
	onMount(async () => {
		console.log('[Client Code Confirm] Starting OAuth code confirmation');
		console.log('[Client Code Confirm] Page URL:', $page.url.toString());
		
		const code = $page.url.searchParams.get('code');
		const next = $page.url.searchParams.get('next') || '/med';
		
		console.log('[Client Code Confirm] Parameters:', { 
			code: code ? `${code.substring(0, 20)}...` : 'null', 
			next 
		});
		
		if (!code) {
			console.error('[Client Code Confirm] No code parameter found');
			error = 'No authentication code found. Please try again.';
			loading = false;
			return;
		}
		
		try {
			// Check if we already have a session (maybe it was set by URL fragments)
			const { data: initialSession } = await $page.data.supabase.auth.getSession();
			console.log('[Client Code Confirm] Initial session check:', {
				hasSession: !!initialSession.session,
				userId: initialSession.session?.user?.id
			});
			
			if (initialSession.session) {
				console.log('[Client Code Confirm] Already authenticated, redirecting to:', next);
				await invalidateAll();
				goto(next, { replaceState: true });
				return;
			}
			
			// Try exchangeCodeForSession if available (newer versions)
			if (typeof $page.data.supabase.auth.exchangeCodeForSession === 'function') {
				console.log('[Client Code Confirm] Using exchangeCodeForSession');
				const { data, error: exchangeError } = await $page.data.supabase.auth.exchangeCodeForSession(code);
				
				if (exchangeError) {
					console.error('[Client Code Confirm] Code exchange failed:', exchangeError);
					error = exchangeError.message;
					loading = false;
					return;
				}
				
				if (data.session) {
					console.log('[Client Code Confirm] Code exchange success, redirecting to:', next);
					await invalidateAll();
					goto(next, { replaceState: true });
					return;
				}
			}
			
			// For older versions, the session might be set asynchronously
			// Wait a bit and check again
			console.log('[Client Code Confirm] Waiting for session to be established...');
			
			let attempts = 0;
			const maxAttempts = 10;
			
			while (attempts < maxAttempts) {
				await new Promise(resolve => setTimeout(resolve, 500));
				
				const { data: delayedSession } = await $page.data.supabase.auth.getSession();
				console.log(`[Client Code Confirm] Session check attempt ${attempts + 1}:`, {
					hasSession: !!delayedSession.session,
					userId: delayedSession.session?.user?.id
				});
				
				if (delayedSession.session) {
					console.log('[Client Code Confirm] Session found, redirecting to:', next);
					await invalidateAll();
					goto(next, { replaceState: true });
					return;
				}
				
				attempts++;
			}
			
			// If we get here, authentication failed
			console.error('[Client Code Confirm] Authentication timed out - no session established');
			error = 'Authentication timed out. Please try again.';
			loading = false;
			
		} catch (err) {
			console.error('[Client Code Confirm] Unexpected error:', err);
			error = 'An unexpected error occurred. Please try again.';
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Confirming Authentication...</title>
</svelte:head>

{#if loading}
	<div class="confirmation-container">
		<div class="loading-spinner"></div>
		<h1>Confirming your authentication...</h1>
		<p>Please wait while we log you in.</p>
	</div>
{:else if error}
	<div class="confirmation-container error">
		<h1>Authentication Failed</h1>
		<p>{error}</p>
		<a href="/auth" class="button">Try Again</a>
	</div>
{/if}

<style>
	.confirmation-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
		text-align: center;
	}
	
	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid #f3f3f3;
		border-top: 3px solid #3498db;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1.5rem;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.error {
		color: #e74c3c;
	}
	
	.button {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background-color: #3498db;
		color: white;
		text-decoration: none;
		border-radius: 5px;
		margin-top: 1rem;
	}
	
	.button:hover {
		background-color: #2980b9;
	}
	
	h1 {
		margin-bottom: 1rem;
		font-size: 1.5rem;
	}
	
	p {
		margin-bottom: 0.5rem;
		color: #666;
	}
</style> 