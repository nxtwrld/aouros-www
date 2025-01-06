import { type Signal } from '$lib/types.d';
import { getDocument, updateDocument } from '$lib/documents';
import {  type Document } from '$lib/documents/types.d';
import { profiles, updateProfile} from '$lib/profiles';
import { type Profile } from '$lib/types.d';

export async function updateSignals(signals: Signal[], user_id: string, refId: string = 'input') {

    // 1. get  users health profile document
    const profile = await profiles.get(user_id) as Profile;

    const document = await getDocument(profile.healthDocumentId) as Document;
    let contentSignals = document.content.signals || {};
    



    // 2. update / create signal value and update signals history
    signals.forEach(signal => {
        signal.refId = signal.refId || refId;
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
    document.content.signals = contentSignals;
    console.log('document', document);

    // 3. update document
    await updateDocument(document);

    // 4. update profile
    profile.health.signals = contentSignals;
    updateProfile(profile);


}
