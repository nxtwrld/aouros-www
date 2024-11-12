import profiles from './profiles';
import profile from './profile';
import { importDocuments } from '$lib/med/documents';

/** 
 *  Removes links between a parent and a profile
*/
export async function removeLinkedParent(profile_id: string) {
   const response = await fetch('/v1/med/profiles/' + profile_id + '?link_type=parent', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    await loadProfiles(undefined, true);
    return
}

/** 
 *  Removes links between a profile and a parent
*/
export async function removeLinkedProfile(profile_id: string) {
    const response = await fetch('/v1/med/profiles/' + profile_id, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    await loadProfiles(undefined, true);
    return
}

/** 
 *  Load
*/  
export async function loadProfiles(fetch: any = undefined, force: boolean = false) {
/*
    if (!force && profiles.get().length > 0) {
        console.log('profiles already loaded', profiles.get());
        return;
    }
*/
    if (!fetch) fetch = window.fetch;
    // fetch basic profile data
    const profilesLoaded = await fetch('/v1/med/profiles').then(r => r.json()).catch(e => {
        console.error('Error loading profiles', e);
        return [];
    });

    // extend proifle data with decrypted data
    const profilesExtended = await Promise.all(profilesLoaded
        .filter(d => d.profiles != null)
        .map(async (d) => {
            // fetch encrypted profile and health documents
            const rootsEncrypted = await fetch(`/v1/med/profiles/${d.profiles.id}/documents?types=profile,health&full=true`)
                .then(r => r.json()).catch(e => {
                    console.error('Error loading profile documents', e);
                    return [];
                });

            
            // decrypt documents
            const roots = await importDocuments(rootsEncrypted);
            // map profile data
            return mapProfileData(d, roots);
        })
    );

    // set profiles
    profiles.set(profilesExtended || []);
}




export { profiles, profile };




export function mapProfileData(core, roots) {

    let profile = null, health = null;

    roots.forEach(r => {  
        if (r.type === 'profile') {
            profile = r.content;
        }
        if (r.type === 'health') {
            health = r.content;
        }
        delete r.content.title;
        delete r.content.tags;
    });

    const profileData =  {
        ...core.profiles,
        status: core.status,
        insurance: {},
        health: {},
        vcard: {}
    }

    if (profile) {
        profileData.vcard = profile.vcard;
        profileData.insurance = profile.insurance;
        profileData.birthDate = profile.birthDate;
    }

    if (health) {

        profileData.health = health;
    }
    return profileData
}
