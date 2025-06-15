
import { error, json } from '@sveltejs/kit';


/** @type {import('./$types.d').RequestHandler} */
export async function GET({ request, params, locals: { supabase, safeGetSession, user }}) {


    const { session } = await safeGetSession();

    if (!session || !user) {
      return error(401, { message: 'Unauthorized' });
    }


    const { data: documentsLoad, error: documentsError } = await supabase.from('documents').select('id, metadata, content, type, attachments, user_id, author_id, keys!inner(key, owner_id)')
        .eq('user_id', params.pid)
        .eq('id', params.did)
        .eq('keys.user_id', user.id).single();


    if (documentsError) {
        console.error('Error loading documents', documentsError);
        return error(500, { message: 'Error loading documents' });
    }

    

    return json(documentsLoad);
}


/**
 * Update document with new data
 * @param param0 
 * @returns 
 */
export async function PUT({ request, params, locals: { supabase, safeGetSession, user }}) {

    const { session } = await safeGetSession();

    if (!session || !user) {
      return error(401, { message: 'Unauthorized' });
    }


    // check if user has proper keys to update document
    const { data: documentKeys, error: documentKeysError } = await supabase.from('keys').select('id, key, owner_id, user_id')
        .eq('document_id', params.did)
        .eq('owner_id', params.pid)
        .eq('user_id', user.id)
        .single();

    if (documentKeysError) {
        console.error('Error loading document keys', documentKeysError);
        return error(500, { message: 'Error loading document keys' });
    }

    if (!documentKeys) {
        return error(401, { message: 'Unauthorized' });
    }

    const { metadata, content, attachments } = await request.json();

    if (!metadata || !content) {
        return error(400, { message: 'Invalid request' });
    }

    console.log('Update document', params.did, params.pid);

    const { data: documentUpdate, error: documentUpdateError } = await supabase.from('documents')
        .update({ 
            metadata, 
            content,
            attachments,
            updated_at: new Date()
        })
        .eq('user_id', params.pid)
        .eq('id', params.did);
//        .eq('keys.user_id', user.id);

    if (documentUpdateError) {
        console.error('Error updating document', documentUpdateError);
        return error(500, { message: 'Error updating document' });
    }
    console.log('Document udpated', documentUpdate);

    return json(documentUpdate);
}


/**
 * Delete document
 * @param param0 
 * @returns 
 */

export async function DELETE({ request, params, locals: { supabase, safeGetSession, user }}) {

    const { session } = await safeGetSession();

    if (!session || !user) {
      return error(401, { message: 'Unauthorized' });
    }

    const { data: documentDelete, error: documentDeleteError } = await supabase.from('documents')
        .delete()
        .eq('id', params.did)
        .eq('user_id', params.pid);

    if (documentDeleteError) {
        console.error('Error deleting document', documentDeleteError);
        return error(500, { message: 'Error deleting document' });
    }

    return json(documentDelete);
}