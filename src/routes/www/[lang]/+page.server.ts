import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	// Redirect to the homepage for the selected language
	throw redirect(307, `/www/${params.lang}/home`);
};