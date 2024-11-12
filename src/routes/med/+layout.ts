import { fail, redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { setUser } from '$slib/user';


export const load: LayoutLoad = async ({ fetch, parent }) => {

    await parent();
    console.log('loading.user...')

    // fetch basic user data
    const userData = await fetch('/v1/med/user').then(r => r.json()).catch(e => {
        console.error('Error loading user', e);
        redirect(303, '/account')
    });
    
    if (userData && userData.fullName && userData.private_keys && userData.publicKey) {
    
      await setUser(userData);
    
      return {  };
    } else {
      redirect(303, '/account')
    }


}

export const trailingSlash = 'always';

