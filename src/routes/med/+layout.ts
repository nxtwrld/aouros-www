import { fail, redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { setUser } from '$lib/user';
import { locale, waitLocale } from 'svelte-i18n';
import { loadProfiles } from '$lib/med/profiles';

export const load: LayoutLoad = async ({ fetch, parent }) => {

    await parent();

    // fetch basic user data
    const userData = await fetch('/v1/med/user').then(r => r.json()).catch(e => {
        console.error('Error loading user', e);
        redirect(303, '/account')
    });

    await loadProfiles(fetch);
    
    // setting up locale


    if (userData && userData.fullName && userData.private_keys && userData.publicKey) {
      locale.set(userData.language || 'en')
      await waitLocale();
      
      await setUser(userData);
    
      return {  };
    } else {
      redirect(303, '/account')
    }


}

export const trailingSlash = 'always';

