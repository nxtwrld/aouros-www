<script lang="ts">
	import { _ } from 'svelte-i18n';

	let visible = $state(false);
	let sectionEl: HTMLElement | undefined = $state();

	$effect(() => {
		if (!sectionEl) return;
		const root = sectionEl.closest('.www-layout') as HTMLElement | null;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					visible = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.15, root }
		);
		observer.observe(sectionEl);
		return () => observer.disconnect();
	});
</script>

<section id="story" class="section-story" class:-visible={visible} bind:this={sectionEl}>
	<div class="story-inner">
		<svg class="story-logo" viewBox="0 0 500 500" aria-hidden="true">
			<use href="/logo.svg#icon" />
		</svg>
		<h2 class="story-title">{$_('www.story.title')}</h2>
		<p class="story-symbol">{$_('www.story.symbol')}</p>
		<p class="story-text">{$_('www.story.p1')}</p>
		<p class="story-text">{$_('www.story.p2')}</p>
		<p class="story-text">{$_('www.story.p3')}</p>
		<p class="story-text">{$_('www.story.ownership')}</p>
		<p class="story-tagline">{$_('www.story.tagline')}</p>
	</div>
</section>

<style>
	.section-story {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 4rem 2rem;
		position: relative;
	}

	.story-inner {
		max-width: 640px;
		z-index: 1;
	}

	.story-inner > * {
		opacity: 0;
		transform: translateY(24px);
		transition: opacity 0.7s ease, transform 0.7s ease;
	}

	.-visible .story-inner > * {
		opacity: 1;
		transform: translateY(0);
	}

	.-visible .story-inner > :nth-child(2) { transition-delay: 0.15s; }
	.-visible .story-inner > :nth-child(3) { transition-delay: 0.3s; }
	.-visible .story-inner > :nth-child(4) { transition-delay: 0.45s; }
	.-visible .story-inner > :nth-child(5) { transition-delay: 0.6s; }
	.-visible .story-inner > :nth-child(6) { transition-delay: 0.75s; }
	.-visible .story-inner > :nth-child(7) { transition-delay: 0.9s; }
	.-visible .story-inner > :nth-child(8) { transition-delay: 1.05s; }

	.story-logo {
		width: clamp(3.5rem, 8vw, 5rem);
		height: clamp(3.5rem, 8vw, 5rem);
		margin-bottom: 1rem;
	}

	.story-title {
		font-family: 'Baloo Thambi 2';
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		color: var(--www-text, #1a1a2e);
		margin: 0 0 0.5rem;
		line-height: 1.2;
	}

	.story-symbol {
		font-size: clamp(1.05rem, 1.8vw, 1.25rem);
		font-style: italic;
		color: var(--www-text, #1a1a2e);
		margin: 0 0 2rem;
	}

	.story-text {
		font-size: clamp(1rem, 1.5vw, 1.15rem);
		color: var(--www-text-secondary, #555);
		line-height: 1.7;
		margin: 0 0 1.25rem;
	}

	.story-tagline {
		font-family: 'Baloo Thambi 2';
		font-size: clamp(1.25rem, 2.5vw, 1.6rem);
		color: var(--www-text, #1a1a2e);
		margin: 1.5rem 0 0;
		line-height: 1.3;
	}

	@media (max-width: 768px) {
		.section-story {
			padding: 3rem 1.5rem;
			min-height: auto;
		}
	}
</style>
