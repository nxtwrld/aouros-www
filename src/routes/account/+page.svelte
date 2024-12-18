<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import steps from '$components/onboarding/steps';
    import { onMount } from 'svelte';
	import type { VCard } from '$lib/contact/types.d';
    import { goto } from '$app/navigation';
	import { prepareKey, encrypt as encryptAES, exportKey } from '$lib/encryption/aes.js';
	import { encrypt as encryptRSA, pemToKey } from '$lib/encryption/rsa.js';

	let STEP = 0;

	interface EditData {
		bio: {
			email: string;
			fullName: string;
			avatarUrl: string;
			birthDate: string;
			language: string;
		};
		vcard: VCard;
		health: Record<string, any>;
		subscription: string;
		insurance:{
            number: string;
            provider: string;
        };
		privacy: {
			enabled: boolean;
			key_hash?: string;
			publicKey?: string;
			privateKey?: string;
			passphrase?: string;
		}
	}


	export let data;
	export let form;


	let readyNext: boolean = false;
	let hash = '';
	let global: any = undefined;
;

	let { session, profile } = data;
	$: ({ session, profile } = data);

	$: {
		if (hash == '') {
			setLocation(STEP.toString());
		} else {
			STEP = parseInt(hash);
		}
	}

	function setLocation(loc: string) {
		if (global) global.location.hash = loc;
	}

	onMount(() => {
		global = (window as any);
		// set default step to 0 even on refresh
		location.hash = STEP.toString();
		hash = location.hash.slice(1);
		global.addEventListener('hashchange', () => {
			hash = global.location.hash.slice(1);;
		});
	})

	let profileForm: HTMLFormElement
	let loading = false;
	let error: string | null = null;

	let editData: EditData = {
		bio: {
			email: session.user.email,
			fullName: form?.fullName ?? profile?.fullName ?? '',
			avatarUrl: profile?.avatarUrl ?? '',
			language: form?.language ?? profile?.language ?? 'en'
		},
		subscription: profile?.subscription ?? 'individual',
		vcard: JSON.parse(profile?.vcard ?? '{}'),
		insurance: JSON.parse(profile?.insurance ?? '{}'),
		health: JSON.parse(profile?.health ?? '{}'),
		privacy: {
			enabled: (profile?.privateKey && profile?.publicKey) ?? false,
			key_hash: profile?.key_hash ?? undefined,
			privateKey: profile?.privateKey ?? undefined,
			publicKey: profile?.publicKey ?? undefined,
			passphrase: profile?.passphrase ?? undefined
		}
	}

	const handleSubmit: SubmitFunction = async ({formElement, formData, action, cancel}) => {
		//console.log('editData', editData);
		//console.log('handleSubmit', {formElement, formData, action, cancel})
		formData.append('fullName', editData.bio.fullName);
		formData.append('avatarUrl', editData.bio.avatarUrl);
		formData.append('language', editData.bio.language);
		formData.append('vcard', JSON.stringify(editData.vcard));
		formData.append('subscription', editData.subscription);
		formData.append('insurance', JSON.stringify(editData.insurance));
		formData.append('health', JSON.stringify(editData.health));
		formData.append('passphrase', !editData.privacy.enabled ? editData.privacy.passphrase : undefined);

		formData.append('publicKey', editData.privacy.publicKey as string);
		formData.append('privateKey', editData.privacy.privateKey as string);
		formData.append('key_hash', editData.privacy.key_hash as string);
		
		// TODO Create health and profile documents



		const documents = [{
			type: 'health',
			metadata: {
				title: 'Health Profile',
				tags: ['health', 'profile'],
				date: new Date().toISOString(),
			},
			content: {
				title: 'Health Profile',
				tags: ['health', 'profile'],
				signals: {},
				...editData.health
			}
		}, {
			type: 'profile',
			metadata: {
				title: 'Profile',
				tags: ['profile'],
				date: new Date().toISOString(),
			},
			content: {
				title: 'Profile',
				tags: ['profile'],
				
			}
		}];

		const documentsEncrypted = await Promise.all(documents.map(async (d) => {
			const cryptoKey = await prepareKey();
			const encrypted = await Promise.all([d.content, d.metadata].map(s => encryptAES(cryptoKey, JSON.stringify(s))));
			const exportedKey = await exportKey(cryptoKey);
			const profile_key = await pemToKey(editData.privacy.publicKey as string);
			const keyEncrypted = await encryptRSA(profile_key, exportedKey);
			const keys = [{
				key:  keyEncrypted,
			}];
			return {
				content: encrypted[0],
				metadata: encrypted[1],
				keys
			};
		}));




		console.log(documents)
		formData.append('documents', JSON.stringify(documents));

		loading = true
		return async ({ update, result }) => {
			console.log('result', result);
			if (result.type === 'success') {
				loading = false;
				console.log('should go to /med');
				goto('/med');
				return;
			}
			if (result.type === 'failure') {
				error = result.data.error;
				console.log('error', error);
				setStep(0);
				loading = false
			}
			loading = false
		}
	}

	const handleSignOut: SubmitFunction = () => {
		loading = true
		return async ({ update }) => {
			loading = false
			update()
		}
	}

	function setStep(step: number) {
		location.hash = step.toString();
	}
	
</script>

<div class="flex -center view-dark">

	<div class="form modal">
		{#if error}
			<div class="form-instructions -error">{error.message}</div>
		{/if}
		<div class="form-contents">
		<svelte:component this={steps[STEP].component} bind:data={editData} {profileForm}  bind:ready={readyNext} />
		</div>

		<form

		method="post"
		action="?/update"
		use:enhance={handleSubmit}
		bind:this={profileForm}
	>  

		<div class="form-actions">

			{#if STEP > 0}
				<button
					type="button"
					class="button -block"
					on:click={() => setStep(STEP - 1)}
				>
					Back
				</button>
			{/if}

			{#if STEP === steps.length - 1}
				<input
					type="submit"
					class="button -block -primary -large"
					value={loading ? 'Loading...' : 'Save'}
					disabled={!readyNext || loading}
				/>
			{:else}
				<button
					type="button"
					class="button -block -primary"
					on:click={() => setStep(STEP + 1)}
					disabled={!readyNext}
				>
					Next
				</button>
			{/if}

		</div>
	</form>
	</div>
	<form class="signout" method="post" action="?/signout" use:enhance={handleSignOut}>
		<div>
			<button class="button block" disabled={loading}>Sign Out</button>
		</div>
	</form>
	
</div>


<style>
	.view-dark {
		background-color: var(--color-blue);
	}
	.modal {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		min-height: 40rem;
	}
	.modal .form-contents {
		flex-grow: 1;
	}
	.signout {
		position: fixed;
		top : 1rem;
		right: 1rem;
	}
</style>