import type { PageServerLoad } from './$types';
import { loadContent } from '$lib/content/loader.server';

// Enable prerendering for static content
export const prerender = true;

export const load: PageServerLoad = async ({ params }) => {
	const { lang, slug } = params;
	
	const content = await loadContent(lang, slug);
	
	return {
		content,
		slug,
		lang
	};
};