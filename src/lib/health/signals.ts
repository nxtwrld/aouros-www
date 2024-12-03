import { type Signal } from '$lib/med/types.d';
import { getDocument, updateDocument } from '$lib/med/documents';
import {  type Document } from '$lib/med/documents/types.d';
import { profiles, updateProfile} from '$lib/med/profiles';
import { type Profile } from '$lib/med/types.d';

export async function updateSignals(signals: Signal[], user_id: string, source: string = 'input') {

    // 1. get  users health profile document
    const profile = await profiles.get(user_id) as Profile;

    const document = await getDocument(profile.healthDocumentId) as Document;
    let contentSignals = document.content.signals || {};
    
    console.log('contentSignals', contentSignals);
    // 2. update / create signal value and update signals history
    signals.forEach(signal => {
        signal.source = signal.source || source;
        if (!contentSignals[signal.signal]) {
            contentSignals[signal.signal] = {
                log: 'full',
                history: [],
                values: []
            };
        }
        contentSignals[signal.signal].values = [...contentSignals[signal.signal].values, {
            ...signal
        }].sort((a, b) => (new Date(b.date)).getTime() - (new Date(a.date)).getTime());
    });

    console.log('contentSignals', contentSignals);
    console.log('document', document);
    // 3. update document
    await updateDocument(document);

    // 4. update profile
    profile.health.signals = contentSignals;
    updateProfile(profile);


}
