import { type Document } from '$lib/med/documents/types.d';
import { profiles } from '$lib/med/profiles';
import { type Profile } from '$lib/med/types.d';

export function getAuthor(document: Document): Profile | null {
    try {
        const profile = profiles.get(document.author_id) as Profile;
        return profile;
    } catch (e) {
        console.log('Author not found in profiles....', document.id, document.author_id);
        return null;
    }
}


export function getByAnotherAuthor(document: Document): Profile | null {
    if (document.author_id == document.user_id) {
        return null;
    }
    return getAuthor(document);
}