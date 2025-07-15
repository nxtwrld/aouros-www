<script lang="ts">
	import type { Session, User } from '@supabase/supabase-js';
	
	export let session: Session | null = null;
	export let user: User | null = null;
	export let lang: string;
	
	// Static translations to avoid reactive locale changes
	const translations = {
		en: {
			'auth.login': 'Login',
			'auth.dashboard': 'Dashboard',
			'auth.profile': 'Profile'
		},
		cs: {
			'auth.login': 'Přihlášení',
			'auth.dashboard': 'Dashboard',
			'auth.profile': 'Profil'
		},
		de: {
			'auth.login': 'Anmelden',
			'auth.dashboard': 'Dashboard',
			'auth.profile': 'Profil'
		}
	};
	
	function t(key: string): string {
		const currentTranslations = translations[lang as keyof typeof translations] || translations.en;
		return currentTranslations[key as keyof typeof currentTranslations] || key;
	}
	
	// Get display name from user data
	function getDisplayName(user: User | null): string {
		if (!user) return '';
		
		// Try user metadata first
		if (user.user_metadata?.full_name) {
			return user.user_metadata.full_name;
		}
		
		// Try email username
		if (user.email) {
			const emailParts = user.email.split('@');
			if (emailParts.length > 0) {
				return emailParts[0];
			}
		}
		
		// Fallback to user ID (first 8 chars)
		return user.id.substring(0, 8);
	}
	
	$: isAuthenticated = !!session && !!user;
	$: displayName = getDisplayName(user);
</script>

{#if isAuthenticated}
	<!-- Authenticated user - show user info and link to dashboard -->
	<div class="user-menu">
		<a href="/med" class="user-link">
			<div class="user-avatar">
				{displayName.charAt(0).toUpperCase()}
			</div>
			<span class="user-name">{displayName}</span>
		</a>
	</div>
{:else}
	<!-- Not authenticated - show login button -->
	<a href="/auth" class="login-button">
		{t('auth.login')}
	</a>
{/if}

<style>
	.login-button {
		padding: 0.5rem 1.25rem;
		border-radius: 0.375rem;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s;
		white-space: nowrap;
		background: transparent;
		color: var(--color-text, #333);
		border: 1px solid var(--color-border, #e0e0e0);
	}
	
	.login-button:hover {
		background: var(--color-bg-secondary, #f8f9fa);
		border-color: var(--color-text, #333);
		transform: translateY(-1px);
	}
	
	.user-menu {
		position: relative;
	}
	
	.user-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		text-decoration: none;
		color: var(--color-text, #333);
		transition: all 0.2s;
		border: 1px solid transparent;
	}
	
	.user-link:hover {
		background: var(--color-bg-secondary, #f8f9fa);
		border-color: var(--color-border, #e0e0e0);
	}
	
	.user-avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--color-primary, #007bff);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
	}
	
	.user-name {
		font-weight: 500;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	
	/* Mobile styles */
	@media (max-width: 768px) {
		.login-button,
		.user-link {
			width: 100%;
			text-align: center;
			padding: 0.75rem 1.25rem;
		}
		
		.user-name {
			max-width: none;
		}
	}
</style>