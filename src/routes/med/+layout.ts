import { fail, redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { setUser } from '$lib/user';
import { locale, waitLocale } from 'svelte-i18n';
import { loadProfiles } from '$lib/profiles';

// Simple loop detection
let loadCount = 0;
const maxLoads = 3;

export const load: LayoutLoad = async ({ fetch, parent, url }) => {
    
    // Prevent infinite loops
    loadCount++;
    if (loadCount > maxLoads) {
        console.error('[Med Layout] Too many load attempts, preventing infinite loop');
        throw new Error('Layout loading loop detected');
    }

    const { session, user } = await parent();
    
    // Guard: Only proceed if we have a valid session
    if (!session || !user) {
        console.log('[Med Layout] No session found, redirecting to auth');
        redirect(303, '/auth');
    }

    console.log('[Med] Loading for user:', user.email, 'attempt:', loadCount);
    
    // fetch basic user data - now safe because we have a session
    const userData = await fetch('/v1/med/user').then(r => r.json()).catch(e => {
        console.error('Error loading user', e);
        redirect(303, '/account')
    });
    await loadProfiles(fetch);
    
    // setting up locale

    if (userData && userData.fullName && userData.private_keys && userData.publicKey) {
      locale.set(userData.language || 'en')
      await waitLocale();
      
      // Pass the user session to avoid auth calls during hydration
      await setUser(userData, user);
      
      // Reset counter on successful load
      loadCount = 0;
      
      return {  };
    } else {
      redirect(303, '/account')
    }


}

export const trailingSlash = 'always';

