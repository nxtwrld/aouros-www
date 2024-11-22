
import { error, json } from '@sveltejs/kit';
import { transcribeAudio } from '$lib/audio/whisper';


/** @type {import('./$types.d').RequestHandler} */
export async function POST({ request }) {
	//const str = url.searchParams.get('drug');
    let instructions = {
        "lang": "en"
    }
    const formData = await request.formData();
    const uploadedFile = await formData?.get('file')
    const instructionsExtend = await formData?.get('instructions')

    if (instructionsExtend !== undefined) {
        try {
            instructions = Object.assign(instructions, JSON.parse(instructionsExtend as string));
        } catch (e) {
            console.log(e);
        }
    }
    //console.log(instructions);


    //return json({'message': 'success'});
    if (!uploadedFile) {
        error(400, { message: 'No file provided' });
    }
    if (uploadedFile instanceof File === false) {
        error(400, { message: 'Invalid file' });
    }
    if (uploadedFile.type !== 'audio/mp3') {
        error(400, { message: 'Invalid file type' });
    }

    const result = await transcribeAudio(uploadedFile, instructions);

    /*const bytes = new Uint8Array(await uploadedFile.arrayBuffer());

    const result = await transcribeAudio(bytes, instructions);*/

    return json(result);
}

