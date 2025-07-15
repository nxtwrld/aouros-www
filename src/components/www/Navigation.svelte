<script lang="ts">
	import { page } from '$app/stores';
	import LoginButton from './LoginButton.svelte';
	import type { Session, User } from '@supabase/supabase-js';
	
	export let lang: string;
	export let session: Session | null = null;
	export let user: User | null = null;
	
	// Static translations to avoid reactive locale changes
	const translations = {
		en: {
			'nav.home': 'Home',
			'nav.families': 'For Families',
			'nav.doctors': 'For Doctors',
			'nav.appconnect': 'AppConnect',
			'nav.security': 'Security',
			'nav.pricing': 'Pricing',
			'nav.about': 'About',
			'nav.beta': 'Get Started',
			'nav.login': 'Login',
			'nav.getStarted': 'Get Started Free'
		},
		cs: {
			'nav.home': 'Domů',
			'nav.families': 'Pro rodiny',
			'nav.doctors': 'Pro lékaře',
			'nav.appconnect': 'AppConnect',
			'nav.security': 'Zabezpečení',
			'nav.pricing': 'Ceník',
			'nav.about': 'O nás',
			'nav.beta': 'Začít',
			'nav.login': 'Přihlášení',
			'nav.getStarted': 'Začít zdarma'
		},
		de: {
			'nav.home': 'Startseite',
			'nav.families': 'Für Familien',
			'nav.doctors': 'Für Ärzte',
			'nav.appconnect': 'AppConnect',
			'nav.security': 'Sicherheit',
			'nav.pricing': 'Preise',
			'nav.about': 'Über uns',
			'nav.beta': 'Loslegen',
			'nav.login': 'Anmelden',
			'nav.getStarted': 'Kostenlos starten'
		}
	};
	
	// Define navigation items
	const navItems = [
		{ slug: 'home', label: 'nav.home' },
		{ slug: 'families', label: 'nav.families' },
		{ slug: 'doctors', label: 'nav.doctors' },
		{ slug: 'appconnect', label: 'nav.appconnect' },
		{ slug: 'security', label: 'nav.security' },
		/*{ slug: 'pricing', label: 'nav.pricing' },*/
		{ slug: 'beta', label: 'nav.beta' }
	];
	
	let mobileMenuOpen = false;
	
	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
	
	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
	
	function t(key: string): string {
		const currentTranslations = translations[lang as keyof typeof translations] || translations.en;
		return currentTranslations[key as keyof typeof currentTranslations] || key;
	}
</script>

<nav class="main-navigation">
	<div class="nav-container">
		<div class="nav-brand">
			<a href="/www/{lang}/home" on:click={closeMobileMenu}>
				<span class="brand-name">Mediqom</span>
			</a>
		</div>
		
		<button 
			class="mobile-menu-toggle"
			on:click={toggleMobileMenu}
			aria-label="Toggle menu"
		>
			<span class="hamburger"></span>
			<span class="hamburger"></span>
			<span class="hamburger"></span>
		</button>
		
		<div class="nav-menu" class:open={mobileMenuOpen}>
			<ul class="nav-links">
				{#each navItems as item}
					<li>
						<a 
							href="/www/{lang}/{item.slug}"
							class:active={$page.url.pathname === `/www/${lang}/${item.slug}`}
							on:click={closeMobileMenu}
						>
							{t(item.label)}
						</a>
					</li>
				{/each}
			</ul>
			
			<div class="nav-actions">
				<LoginButton {session} {user} {lang} />
				<a href="/www/{lang}/beta" class="btn-primary">
					{t('nav.getStarted')}
				</a>
			</div>
		</div>
	</div>
</nav>

<style>
	.main-navigation {
		background: var(--color-bg-nav, #ffffff);
		border-bottom: 1px solid var(--color-border, #e0e0e0);
		position: sticky;
		top: 0;
		z-index: 1000;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}
	
	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 4rem;
	}
	
	.nav-brand {
		display: flex;
		align-items: center;
		z-index: 1001;
	}
	
	.nav-brand a {
		display: flex;
		align-items: center;
		text-decoration: none;
		color: var(--color-text, #333);
		gap: 0.75rem;
	}
	
	
	.brand-name {
		font-size: 1.25rem;
		font-weight: 600;
	}
	
	.mobile-menu-toggle {
		display: none;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		z-index: 1001;
	}
	
	.hamburger {
		display: block;
		width: 24px;
		height: 2px;
		background: var(--color-text, #333);
		margin: 5px 0;
		transition: all 0.3s ease;
	}
	
	.nav-menu {
		display: flex;
		align-items: center;
		gap: 3rem;
		flex: 1;
		justify-content: space-between;
	}
	
	.nav-links {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 2rem;
		margin-left: 3rem;
	}
	
	.nav-links a {
		text-decoration: none;
		color: var(--color-text, #333);
		font-weight: 500;
		padding: 0.5rem 0;
		position: relative;
		transition: color 0.2s;
	}
	
	.nav-links a:hover {
		color: var(--color-primary, #007bff);
	}
	
	.nav-links a.active {
		color: var(--color-primary, #007bff);
	}
	
	.nav-links a.active::after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--color-primary, #007bff);
	}
	
	.nav-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
	}
	
	.btn-primary {
		padding: 0.5rem 1.25rem;
		border-radius: 0.375rem;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s;
		white-space: nowrap;
		background: var(--color-primary, #007bff);
		color: white;
		border: 1px solid var(--color-primary, #007bff);
	}
	
	.btn-primary:hover {
		background: var(--color-primary-dark, #0056b3);
		border-color: var(--color-primary-dark, #0056b3);
		transform: translateY(-1px);
		box-shadow: 0 4px 8px rgba(0, 123, 255, 0.2);
	}
	
	/* Mobile Styles */
	@media (max-width: 768px) {
		.mobile-menu-toggle {
			display: block;
		}
		
		.nav-menu {
			position: fixed;
			top: 4rem;
			left: 0;
			right: 0;
			bottom: 0;
			background: var(--color-bg-nav, #ffffff);
			flex-direction: column;
			padding: 2rem;
			gap: 2rem;
			transform: translateX(100%);
			transition: transform 0.3s ease;
			justify-content: flex-start;
		}
		
		.nav-menu.open {
			transform: translateX(0);
		}
		
		.nav-links {
			flex-direction: column;
			width: 100%;
			margin-left: 0;
			gap: 0;
		}
		
		.nav-links li {
			width: 100%;
		}
		
		.nav-links a {
			display: block;
			padding: 1rem 0;
			border-bottom: 1px solid var(--color-border, #e0e0e0);
		}
		
		.nav-actions {
			flex-direction: column;
			width: 100%;
		}
		
		.btn-primary {
			width: 100%;
			text-align: center;
			padding: 0.75rem 1.25rem;
		}
	}
</style>