import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyHash } from '$lib/encryption/hash';
//import { loadUser } from '$lib/user/server';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession, user }, fetch }) => {
  const { session } = await safeGetSession()

  if (!session || !user) {
    redirect(303, '/auth')
  }


  //const profile = await loadUser(supabase);
  const profile = await fetch('/v1/med/user').catch(e => {
    console.error('Error loading user data', e);
    redirect(303, '/auth');
  }).then(r => r.json())

  //console.log('profile', profile)

  if (profile && profile.fullName && profile.private_keys && profile.publicKey) {
    console.log('profile loaded - redirecting to med');
    redirect(303, '/med');
  }

  return { session, profile, userEmail: user.email };


}

export const actions: Actions = {
  update: async ({ request, locals: { supabase, safeGetSession, user } }) => {
    const formData = await request.formData()
    const fullName = formData.get('fullName') as string
    const avatarUrl = formData.get('avatarUrl') as string
    const language = formData.get('language') as string
    const passphrase = (formData.get('passphrase') == 'undefined') ? null : formData.get('passphrase') as string
    const subscription = formData.get('subscription') as string
    const privateKey = formData.get('privateKey') as string
    const publicKey = formData.get('publicKey') as string
    const key_hash = formData.get('key_hash') as string
    const documents = JSON.parse(formData.get('documents') as string);

    const { session } = await safeGetSession()

    if (!session || !user) {
      return fail(403, { error: 'Unauthorized'})
    }

    if (passphrase && !(await verifyHash(passphrase, key_hash))) {
      return fail(400, { error: 'Invalid passphrase' })
    }

    // store profile data
    //console.log('update profile', fullName, avatarUrl, subscription, publicKey, session?.user.id);

    const { error: profileError } = await supabase.from('profiles').update({
      fullName,
      avatarUrl,
      subscription,
      language,
      publicKey,
      updated_at: new Date(),
    })
    .eq('owner_id', user.id)
    .eq('auth_id', user.id)

    if (profileError) {
      console.log('profile error', profileError);
      return fail(500, {
        error: profileError,
        auth_id: user.id,
        fullName,
        avatarUrl,
        subscription,
        privateKey,
        publicKey,
        key_hash: key_hash,
      })
    }

    console.log('update private key');


    // store privateKey in separate protected table
    const { error: keyError } = await supabase.from('private_keys').upsert({
      id: user.id,
      privateKey,
      key_hash,
      key_pass: passphrase,
      updated_at: new Date(),
    })


    if (keyError) {
      console.log('key error', keyError);
      // clear profile data
      await clear(['profiles'], supabase, user);
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
    // create profiles_links
    /*
    const {  error: errorProfileLink } = await supabase.from('profiles_links')
        .insert([
            { 
                parent_id: session?.user.id,
                profile_id: session?.user.id,
                status: 'approved'
            }]);
    
    if (errorProfileLink) {
        console.log('Error saving profile link', errorProfileLink)
        await clear(['profiles', 'private_keys'], supabase, user);
        return error(500, { message: 'Error saving profile link' });
    }
        */



    // create default profile documents
    await Promise.all(documents.map(async (doc: any) => {

      const { type, metadata, content, keys } = doc;

      console.log('document', type);
      const { data: documentInsert, error: documentInsertError } = await supabase.from('documents')
          .insert([{ 
              user_id: user.id, 
              type, 
              metadata, 
              content,
              author_id: user.id,
              attachments: []
          }]).select('id');

      if (documentInsertError) {
          console.error('Error inserting document', documentInsertError);
          await clear(['profiles', 'private_keys', 'profiles_links', 'document', 'keys'], supabase, user);
          return error(500, { message: 'Error inserting document' });
      }

      const document_id = documentInsert[0].id;
      

      keys.forEach((key: any) => {
          key.user_id = user.id;
          key.owner_id = user.id;
          key.document_id = document_id;
          key.author_id = user.id;
          console.log('key', key);
      });

      
      const { data: keysInsert, error: keysInsertError } = await supabase.from('keys')
          .insert(keys);


      if (keysInsertError) {
          console.error('Error inserting keys', keysInsertError);
          await clear(['profiles', 'private_keys', 'profiles_links', 'documents', 'keys'], supabase, user);
          return error(500, { message: 'Error inserting keys' });
      }
    }));



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



function clear(clearing: string[], supabase: any, user: any) {
  return Promise.all(clearing.map(async (table) => {
      switch (table) {
        case 'profiles':
          await supabase.from('profiles').upsert(
            { 
              id: user.id,
              auth_id: user.id,
              fullName: null,
              avatarUrl: null,
              subscription: null,
              publicKey: null
            }
          )
          break;
        case 'private_keys':
          await supabase.from('private_keys').delete().eq('id', user.id) 
          break;
        case 'profiles_links':
          //await supabase.from('profiles_links').delete().eq('parent_id', user.id)
          break;
        case 'documents':
          await supabase.from('documents').delete().eq('user_id', user.id)
          break;
        case 'keys':
          await supabase.from('keys').delete().eq('user_id', user.id)
          break;

      }
      return
  }));
}