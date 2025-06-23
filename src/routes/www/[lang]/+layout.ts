import type { LayoutLoad } from './$types';
import { locale } from 'svelte-i18n';

export const load: LayoutLoad = async ({ data, parent }) => {
	// Set the locale for svelte-i18n on client side
	locale.set(data.lang);

	// Get parent layout data (includes session and user)
	const parentData = await parent();

	return {
		...data,
		session: parentData.session,
		user: parentData.user
	};
};