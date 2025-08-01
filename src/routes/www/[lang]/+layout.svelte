<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';
	import Navigation from '$components/www/Navigation.svelte';

	export let data: LayoutData;
</script>

<div class="www-layout">
	<Navigation lang={data.lang} session={data.session} user={data.user} />
	
	<div class="language-switcher">
		<a 
			href="/www/en{$page.url.pathname.replace(/^\/www\/[^\/]+/, '')}" 
			class:active={data.lang === 'en'}
			data-sveltekit-preload-data="off"
		>
			English
		</a>
		<a 
			href="/www/cs{$page.url.pathname.replace(/^\/www\/[^\/]+/, '')}" 
			class:active={data.lang === 'cs'}
			data-sveltekit-preload-data="off"
		>
			Čeština
		</a>
		<a 
			href="/www/de{$page.url.pathname.replace(/^\/www\/[^\/]+/, '')}" 
			class:active={data.lang === 'de'}
			data-sveltekit-preload-data="off"
		>
			Deutsch
		</a>
	</div>

	<main>
		<slot />
	</main>
</div>

<style>

@import url('https://fonts.googleapis.com/css2?family=Baloo+Thambi+2:wght@600&display=swap');

* {
    box-sizing: border-box;
}

.www-layout {

    --color-primary: #16d3dd;
    --color-primary-dark: #02b8c1;
    --color-primary-light: #4bf0f9;
    --color-primary-lighter: #9bf8fd;
    --color-primary-contrast: #fff;

    --color-highlight: #e9a642;

    --color-positive: #69e11e;
    --color-negative: #ff0084;
    --color-warning: #f5a623;

/*
    --color-primary: #2a63f2;
    --color-primary-dark: #1c50cd;
    --color-primary-light: #5189f5;
    --color-primay-lighter: #c8dbfa;
    */
    --color-lighter: #fafafa;
    --color-light: #ebebeb;
    --color-secondary: #999;


    --color-diagnosis: var(--color-primary);
    --color-therapy: #65ad38;
    --color-lab: #a2165c;
    --color-vitals: #ff0084;
    --color-imaging: #444444;
    --color-report: #02b8c1;
    --color-consult: #c300ff;
    --color-procedure: #980068;

    --color-white: #FFF;


    --color-border: #d2d2d2;

    --header-height: 3.5rem;
    --footer-height: 3.5rem;
    --footer-bottom: 0;

    /* TOP MARGIN offset for ios status bar */
    --top-offset: 0rem;


    /** IOS PHONE */
    --footer-height: 5rem;
    --footer-bottom: 1rem;

    --page-background: #e7eef4;

	background-color: var(--page-background);
	width: 100vw;
	height: 100vh;
	overflow: auto;
}

/* Unused styles - removed
.page {
    margin: 0 auto;
    padding: 0 1rem;
    max-width: 1100px
}

.page.centered {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
}
*/



/* Unused typography styles - these should be in global CSS if needed
h1 {
    font-family: 'Baloo Thambi 2', cursive;
    font-size: 2.5em;
    color: var(--color-primary-dark);
}

h3 {
    font-size: 1.6em;
    color: var(--color-primary-dark);
    border-bottom: 1px dotted var(--color-primary);
    margin-bottom: 20px;
    padding-bottom: 10px;
    font-family: 'Baloo Thambi 2', cursive;
}

h4 {
    font-size: 1.6em;
    color: var(--color-primary-dark);
    font-family: 'Baloo Thambi 2', cursive;
}

p {
    font-size: 1.1em;
    line-height: 1.5em;
    margin-bottom: 20px;
    transition: color 0.5s;
    text-align: justify;
}
*/

/* Unused - removed
p strong {
    display: inline-block;
    font-weight: 700;
    text-transform: uppercase;
    background-color: var(--color-primary-dark);
    color: #FFF;
    padding: 0 .5em;
}
*/


a {
    color: var(--color-primary-dark); /* Primary color for links */
    text-decoration: none; /* Removing default underline */
    transition: text-shadow 0.5s; /* Transition effect for shadow depth change on hover */
}

a:hover {
    text-shadow: 2px 2px 2px rgba(50, 50, 50, 0.5); /* Deep shadow for an eerie hover effect */
}





/* Unused button style - removed
.button {
    background-color: var(--color-primary);
    border: 0;
    border-radius: 4px;
    color: #FFF;
    cursor: pointer;
    font-size: 1.25rem;
    padding: .5rem 1rem;
}
*/

	.www-layout {
		min-height: 100vh;
	}

	.language-switcher {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		padding: 0.75rem 2rem;
		background: var(--color-bg-secondary, #f8f9fa);
		border-bottom: 1px solid var(--color-border, #e0e0e0);
		font-size: 0.875rem;
	}

	.language-switcher a {
		padding: 0.25rem 0.75rem;
		text-decoration: none;
		color: var(--color-text-muted, #666);
		border-radius: 0.25rem;
		transition: all 0.2s;
	}

	.language-switcher a:hover {
		background-color: var(--color-bg-tertiary, #e9ecef);
		color: var(--color-text, #333);
	}

	.language-switcher a.active {
		background-color: var(--color-primary, #007bff);
		color: white;
		font-weight: 500;
	}

	main {
		padding: 0;
	}
</style>