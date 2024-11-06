import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import { loadUser } from '$slib/user';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const { session } = await safeGetSession()

  if (!session) {
    redirect(303, '/auth')
  }


  const profile = await loadUser();
  if (profile && profile.fullName && profile.privateKey && profile.publicKey) {
    redirect(303, '/med');
  }

  return { session, profile };


}

export const actions: Actions = {
  update: async ({ request, locals: { supabase, safeGetSession } }) => {
    const formData = await request.formData()
    const fullName = formData.get('fullName') as string
    const birthDate = formData.get('birthDate') as string
    const avatarUrl = formData.get('avatarUrl') as string
    const vcard = formData.get('vcard') as string
    const health = formData.get('health') as string
    const insurance = formData.get('insurance') as string
    const subscription = formData.get('subscription') as string
    const privateKey = formData.get('privateKey') as string
    const publicKey = formData.get('publicKey') as string
    const key_hash = formData.get('key_hash') as string

    const { session } = await safeGetSession()

    const { error } = await supabase.from('profiles').upsert({
      id: session?.user.id,
      auth_id: session?.user.id,
      fullName: fullName,
      birthDate: birthDate,
      avatarUrl: avatarUrl,
      vcard: vcard,
      health: health,
      insurance: insurance,
      subscription: subscription,
      privateKey: privateKey,
      publicKey: publicKey,
      key_hash: key_hash,
      updated_at: new Date(),
    })

    const { data: link, error: linkError } = await supabase.from('profile-connect').upsert({
      user_id: session?.user.id,
      profile_id: session?.user.id,
    }).single()

    if (error) {
      return fail(500, {
        fullName,
        avatarUrl,
        birthDate,
        vcard,
        health,
        insurance,
        subscription,
        privateKey: privateKey,
        publicKey: publicKey,
        key_hash: key_hash
      })
    }

    redirect(303, '/med')
    
/*
    return {
      fullName,
      avatarUrl,
      birthDate,
      vcard,
      health,
      insurance,
      subscription,
      privateKey: privateKey,
      publicKey: publicKey,
      key_hash: key_hash
    }*/
  },
  signout: async ({ locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession()
    if (session) {
      await supabase.auth.signOut()
      redirect(303, '/')
    }
  },
}
