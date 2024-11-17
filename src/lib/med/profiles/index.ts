import profiles from './profiles';
import profile from './profile';
import { importDocuments } from '$lib/med/documents';
import { capitalizeFirstLetters, removeNonAlpha, removeNonAlphanumeric, removeNonNumeric, searchOptimize } from '$lib/strings';
import type { Profile } from '$lib/med/types.d';
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


/**
 * Search for profiles with a given name and insurance number
 * 
 * @param name Search for profiles with this name
 * @param insurance_number Search for profiles with this insurance number
 * @returns array of profiles
 */
export function findInProfiles(contact: {
    name: string,
    insurance_number: string
    biologicalSex: string,
    dateOfBirth: string
}): Profile[] {

    let name = contact.name;
    let insurance_number = contact.insurance_number;

    const profilesArray = [...profiles.get()] as Profile[];

    let names = [];
    let insurance_numbers = [];
    if (name) {
        name = name.trim();
        names.push(name);
        names.push(searchOptimize(name));
        if (name.indexOf(' ') > 0) {
            names.push(name.split(' ').pop());
            names.push(searchOptimize(name.split(' ').pop()));
        }
    }
    if (insurance_number) {
        insurance_numbers.push(removeNonNumeric(insurance_number));
        insurance_numbers.push(removeNonAlphanumeric(insurance_number));
        insurance_numbers.push(removeNonAlpha(insurance_number));           
    }

    // remove empty string from names and insurance_numbers
    names.filter(n => n.length > 0);
    insurance_numbers.filter(n => n.length > 0);
    
    // search profiles based on names and insurance_numbers
    const profilesFound = profilesArray.map(p => {
        let r = {
            profile: p,
            matchName: false,
            matchInsurance: false,
        }
        if (names.length > 0) {
            if (names.some(n => searchOptimize(p.fullName).includes(n))) {
                r.matchName = true;
            }
        }
        if (insurance_numbers.length > 0) {
            if (insurance_numbers.some(n => p.insurance && (n === p.insurance.number))) {
                r.matchInsurance = true;
            }
        }
        return r;
    })
    .filter(p => p.matchName || p.matchInsurance)
    .sort((a, b) => {
        if (a.matchName) return -1;
    }).sort((a, b) => {
        if (a.matchInsurance) return -1;
    }).sort((a, b) => {
        if (a.matchName && a.matchInsurance) return -1;
    });

    return  profilesFound.map(p => p.profile);
}


export function nomalizePatientData(patient: any): any {
    
    console.log('patient', patient);
    let result = {};

    if (patient.fullName) {
        result.fullName = capitalizeFirstLetters(patient.fullName.trim());
    }
    if (patient.dateOfBirth) {
        result.dateOfBirth = patient.dateOfBirth;
    }
    if (patient.idenitifier) {
        let insurance_number = removeNonNumeric(patient.idenitifier);
        result.insurance = {
            number: insurance_number,
        }
    }
    return result;
}

export function excludePossibleDuplicatesInPatients(patients: any[]): any[] {
    return patients.filter((p, i) => {
        return patients.findIndex(p2 => {
            return searchOptimize(p2.fullName) === searchOptimize(p.fullName) && p2.insurance.number === p.insurance.number
        }) === i;
    });
}