import { error, json   } from '@sveltejs/kit';
import { type Attachment } from '$lib/documents/types.d';

export async function GET({ request, params, locals: { supabase, safeGetSession }}) {
    
    const { session } = await safeGetSession();
    if (!session) {
        return error(401, 'Unauthorized')
    }
    const url = new URL(request.url);
    const path = url.searchParams.get('path');
    const storagePath = params.pid + '_' + path;
    console.log('path', path);
    const { data, error : errorDownload } = await supabase.storage.from('attachments').download(path)
    
    if (errorDownload) {    
        throw errorDownload;
    }

    return new Response(data);
}

// upload new avatar
export async function POST({ request, params, locals: { supabase, safeGetSession }}) {

    const { session } = await safeGetSession();
    
    if (!session) {
        return error(401, 'Unauthorized')
    }

    const userID = session.user.id;


    const { file: fileData} = await request.json();
    // generate random filename
    const filename = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);


    // conver base64 to file
    const buffer = Buffer.from(fileData, 'utf-8');
    const file = new File([buffer], filename, { type: 'text/plain' });


    const { error: errorUploading } = await supabase.storage.from('attachments').upload( userID+'/'+filename, file)
    if (errorUploading) {
        throw errorUploading
    }
    console.log('uploaded',  userID+'/'+filename)

    const { data } = supabase
        .storage
        .from('attachments')
        .getPublicUrl( userID+'/'+filename)


        return  json({
            url: data.publicUrl,
            path: userID+'/'+filename
         } as Attachment);
}

export async function DELETE({ request, params, locals: { supabase, safeGetSession }}) {
        
        const { session } = await safeGetSession();
        if (!session) {
            return error(401, 'Unauthorized')
        }
        const url = new URL(request.url);
        const path = url.searchParams.get('path');
        const storagePath = path;

        if (!storagePath) {
            return error(400, 'Invalid path')
        }
    
        const { error : errorDelete } = await supabase.storage.from('attachments').remove([storagePath])
        
        if (errorDelete) {    
            throw errorDelete;
        }
    
        return json({deleted: true});
    
}