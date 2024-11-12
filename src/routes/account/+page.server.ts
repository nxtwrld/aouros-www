import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyHash } from '$lib/encryption/hash';
//import { loadUser } from '$lib/user/server';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, fetch }) => {
  const { session } = await safeGetSession()

  if (!session) {
    redirect(303, '/auth')
  }


  //const profile = await loadUser(supabase);
  const profile = await fetch('/v1/med/user').catch(e => {
    console.error('Error loading user data', e);
    redirect(303, '/auth');
  }).then(r => r.json())

  console.log('profile', profile)

  if (profile && profile.fullName && profile.private_keys && profile.publicKey) {
    redirect(303, '/med');
  }

  return { session, profile };


}

export const actions: Actions = {
  update: async ({ request, locals: { supabase, safeGetSession } }) => {
    const formData = await request.formData()
    const fullName = formData.get('fullName') as string
    const avatarUrl = formData.get('avatarUrl') as string
    const passphrase = (formData.get('passphrase') == 'undefined') ? null : formData.get('passphrase') as string
    const subscription = formData.get('subscription') as string
    const privateKey = formData.get('privateKey') as string
    const publicKey = formData.get('publicKey') as string
    const key_hash = formData.get('key_hash') as string

    const { session } = await safeGetSession()
    if (passphrase && !(await verifyHash(passphrase, key_hash))) {
      return fail(400, { error: 'Invalid passphrase' })
    }

    // store profile data
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: session?.user.id,
      auth_id: session?.user.id,
      fullName,
      avatarUrl,
      subscription,
      publicKey,
      updated_at: new Date(),
    })

    if (profileError) {
      return fail(500, {
        error: profileError,
        auth_id: session?.user.id,
        fullName,
        avatarUrl,
        subscription,
        privateKey,
        publicKey,
        key_hash: key_hash,
      })
    }


    // store privateKey in separate protected table
    const { error: keyError } = await supabase.from('private_keys').upsert({
      id: session?.user.id,
      privateKey,
      key_hash,
      key_pass: passphrase,
      updated_at: new Date(),
    })


    if (keyError) {
      // clear profile data
      await supabase.from('profiles').upsert(
        { 
          id: session?.user.id,
          auth_id: session?.user.id,
          fullName: null,
          avatarUrl: null,
          subscription: null,
          publicKey: null
        }
      )
      return fail(500, {
        error: keyError,
        fullName,
        avatarUrl,
        subscription,
        passphrase,
        privateKey: privateKey,
        publicKey: publicKey,
        key_hash: key_hash
      })
    }

    return {};
   
  },
  signout: async ({ locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession()
    if (session) {
      await supabase.auth.signOut()
      redirect(303, '/')
    }
  },
}
