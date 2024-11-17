
import { error, json } from '@sveltejs/kit';
const DOCUMENT_TYPES = ['document', 'profile', 'health'];
const UNIQUE_TYPES = ['profile', 'health'];

/** @type {import('./$types.d').RequestHandler} */
export async function GET({ request, params, locals: { supabase, safeGetSession }}) {


    const { session } = await safeGetSession();

    const url = new URL(request.url);
    const types = url.searchParams.get('types')?.split(',') || DOCUMENT_TYPES;
    const full = url.searchParams.get('full') === 'true';
    if (!session) {
      return error(401, { message: 'Unauthorized' });
    }
    const query = full 
        ? 'id, metadata, type, user_id, content, attachments, author_id, keys!inner(*)(key, owner_id)' 
        : 'id, metadata, type, user_id, author_id, keys!inner(*)(key, owner_id)';

    const { data: documentsLoad, error: documentsError } = await supabase.from('documents').select(query)
        .eq('user_id', params.pid)
        .eq('keys.user_id', session.user.id)
        .in('type', types);


    if (documentsError) {
        console.error('Error loading documents', documentsError);
        return error(500, { message: 'Error loading documents' });
    }

    return json(documentsLoad);
}


export async function POST({ request, params, locals: { supabase, safeGetSession }}) {
    const { session } = await safeGetSession();

    if (!session) {
      return error(401, { message: 'Unauthorized' });
    }

    const { type, metadata, content, attachments, keys } = await request.json();

    if (!type || !metadata) {
        return error(400, { message: 'Invalid request' });
    }

    if (!DOCUMENT_TYPES.includes(type)) {
        return error(400, { message: 'Invalid document type' });
    }

    if (UNIQUE_TYPES.includes(type)) {
        const { data: documentExists, error: documentExistsError } = await supabase.from('documents')
            .select('id')
            .eq('user_id', params.pid)
            .eq('type', type);

        if (documentExistsError) {
            console.error('Error checking for existing document', documentExistsError);
            return error(500, { message: 'Error checking for existing document' });
        }

        if (documentExists.length) {
            return error(400, { message: 'Document already exists' });
        }
    }

    const { data: documentInsert, error: documentInsertError } = await supabase.from('documents')
        .insert([{ 
            user_id: params.pid, 
            type, 
            metadata, content,
            author_id: session.user.id,
            attachments
        }]).select('id)');

    if (documentInsertError) {
        console.error('Error inserting document', documentInsertError);
        return error(500, { message: 'Error inserting document' });
    }

    const document_id = documentInsert[0].id;
    

    keys.forEach((key) => {
        key.document_id = document_id;
        key.author_id = session.user.id;
    });
    
    const { data: keysInsert, error: keysInsertError } = await supabase.from('keys')
        .insert(keys);


    if (keysInsertError) {
        console.error('Error inserting keys', keysInsertError);
        await supabase.from('documents').delete().eq('id', document_id);
        return error(500, { message: 'Error inserting keys' });
    }


    return json({ id: document_id });
}