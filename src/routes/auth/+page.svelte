<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionData, SubmitFunction } from './$types.js'

	interface Props {
		form: ActionData;
	}

	let { form = $bindable() }: Props = $props();

	let loading: boolean = $state(false);
	let submitted: boolean = $state(false);

	const handleSubmit: SubmitFunction = ({ formData, cancel }) => {
		console.log('[Auth Form] Submit attempt - loading:', loading, 'submitted:', submitted);
		
		// Prevent multiple submissions
		if (loading || submitted) {
			console.log('[Auth Form] Blocking duplicate submission');
			cancel(); // This actually prevents the submission
			return;
		}
		
		loading = true;
		submitted = true;
		
		console.log('[Auth Form] Submitting email:', formData.get('email'));
		
		return async ({ result, update }) => {
			console.log('[Auth Form] Form result:', result);
			
			await update();
			
			loading = false;
			
			// Only reset submitted state if there was an error
			if (result.type === 'failure') {
				submitted = false;
				console.log('[Auth Form] Resetting submitted state due to error');
			} else {
				console.log('[Auth Form] Keeping submitted state - success');
			}
		}
	}

	function resetForm() {
		form = null;
		submitted = false;
		loading = false;
	}
</script>

<svelte:head>
	<title>Authentication</title>
</svelte:head>

<form class="flex -column form modal" method="POST" use:enhance={handleSubmit} onsubmit={(e) => {
	if (loading || submitted) {
		console.log('[Auth Form] Preventing form submit via event listener');
		e.preventDefault();
		return false;
	}
}}>
		<img src="/icon.svg" alt="Mediqom app" class="logo" />

		<h1 class="h1">Authentication</h1>
		{#if form?.success}
		<div class="success">
			<p class="form-instructions -success">{form?.message}</p>
			<div class="form-actions">
				<button class="button -block" onclick={resetForm}>Send again</button>
			</div>
		</div>
		{:else}
			<p class="form-instructions">Sign in via magic link with your email below</p>

			{#if form?.message !== undefined}
			<div class="{form?.success ? '' : 'fail'}">
				<p class="form-instructions -error">{form?.message}</p>
				{#if form?.message?.includes('Beta access required')}
					<div class="beta-notice">
						<h3>Need Beta Access?</h3>
						<p>Mediqom is currently in beta. To get access:</p>
						<ol>
							<li>Apply for beta access on our <a href="/www/en/beta">beta page</a></li>
							<li>Wait for approval (usually within 48 hours)</li>
							<li>Check your email for the magic link</li>
						</ol>
					</div>
				{:else if form?.message?.includes('application is under review')}
					<div class="beta-notice">
						<h3>Application Under Review</h3>
						<p>Your beta application is being reviewed. We'll email you within 48 hours once approved.</p>
						<p>Check your spam folder if you don't see our email.</p>
					</div>
				{:else if form?.message?.includes('application was not approved')}
					<div class="beta-notice">
						<h3>Application Status</h3>
						<p>Your beta application was not approved. If you believe this is an error, please contact us at <a href="mailto:beta@mediqom.com">beta@mediqom.com</a>.</p>
					</div>
				{/if}
			</div>
			{/if}

			<!-- Hidden field to pass redirect path -->
			<input type="hidden" name="redirectPath" value="/med" />

			<div class="input">
				<label for="email">Email address</label>
				<input
					id="email"
					name="email"
					class="inputField"
					type="email"
					placeholder="Your email"
					value={form?.email ?? ''}
					disabled={loading}
				/>
			</div>
			{#if form?.errors?.email}
			<span class="flex items-center text-sm error">
				{form?.errors?.email}
			</span>
			{/if}
			<div class="form-actions">
				<button class="button -primary -block" disabled={loading || submitted} type="submit">
					{ loading ? 'Sending...' : submitted ? 'Email sent!' : 'Send magic link' }
				</button>
			</div>
		{/if}
</form>


<style>

	.logo {
		width: 8rem;
		margin: 0 auto;
		display: block;
	}
	.form {
		
	}

	.beta-notice {
		background-color: #f8f9fa;
		border: 1px solid #dee2e6;
		border-radius: 8px;
		padding: 1.5rem;
		margin-top: 1rem;
	}

	.beta-notice h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: #495057;
		font-size: 1.125rem;
	}

	.beta-notice p {
		margin-bottom: 0.5rem;
		color: #6c757d;
	}

	.beta-notice ol {
		margin: 0.5rem 0;
		padding-left: 1.5rem;
		color: #6c757d;
	}

	.beta-notice li {
		margin-bottom: 0.25rem;
	}

	.beta-notice a {
		color: #007bff;
		text-decoration: none;
	}

	.beta-notice a:hover {
		text-decoration: underline;
	}


</style>