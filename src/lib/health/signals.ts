import { type Signal } from '$lib/med/types.d';
import { getDocument, updateDocument } from '$lib/med/documents';
import {  type Document } from '$lib/med/documents/types.d';
import { profiles, updateProfile} from '$lib/med/profiles';
import { type Profile } from '$lib/med/types.d';

export async function updateSignals(signals: Signal[], user_id: string) {

    // 1. get  users health profile document
    const profile = await profiles.get(user_id) as Profile;

    const document = await getDocument(profile.healthDocumentId) as Document;
    let content = document.content;
    
    // 2. update / create signal value and update signals history
    signals.forEach(signal => {
        if (!content[signal.signal]) {
            content[signal.signal] = [];
        }
        content[signal.signal] =[...content[signal.signal], {
            ...signal
        }].sort((a, b) => (new Date(b.date)).getTime() - (new Date(a.date)).getTime());

    })

    // 3. update document
    await updateDocument(document);

    // 4. update profile
    profile.health = content;
    updateProfile(profile);


}
