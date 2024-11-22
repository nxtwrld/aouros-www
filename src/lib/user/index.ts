import { writable, type Writable, get, type Updater} from "svelte/store";
import { getClient } from "$lib/supabase";
import type { VCard } from '$lib/contact/types.d';
import auth from '$lib/auth';
import { decryptString } from "../encryption/passphrase";
import { verifyHash } from "../encryption/hash";
import { KeyPair, pemToKey } from "../encryption/rsa";
//import { loadSubscription } from "./subscriptions";

export type UserFirstTime = {
    email: string;
    id: string;
    auth_id: string;
    language: string;
    unlocked: boolean | undefined;
}

export type User = {
    email: string;
    id: string;
    auth_id: string;
    fullName: string;
    avatarUrl: string;
    subscription: string;
    language: string;
    subscriptionStats: {
        profiles: number;
        scans: number;
    }
    privateKey: string;
    publicKey: string;
    key_hash: string;
    key_pass: string;
    unlocked: boolean | undefined;
    isMedical: boolean;
}

const keys : {
    privateKey?: CryptoKey;
    publicKey?: CryptoKey;
} = {};

let keyPair: KeyPair = new KeyPair();

const user: Writable<User |  UserFirstTime | null> = writable(null);

user.subscribe((value) => {
    if (!value) {
        delete keys.privateKey;
        delete keys.publicKey;
    }
});


const userSession = writable(null);
export const session = {
    subscribe: userSession.subscribe,
    set: userSession.set,
    update: userSession.update,
    get : () => get(userSession)

}


export async function setUser(profile: UserFirstTime | User) {
    const supabase = getClient();
    
    const { data: { user: userSession }, error: userError } = await supabase.auth.getUser();
    if (userError || !userSession) {
        throw userError;
    }

    if (!userSession) {
        throw new Error('No user session');
    }

    if (profile && profile.fullName) {
        // move to server
        //const subscriptionStats = await loadSubscription();
        

        profile.privateKey = profile.private_keys.privateKey;
        profile.key_hash = profile.private_keys.key_hash;
        const key_pass = profile.private_keys.key_pass;

        delete profile.private_keys;


        user.set({
            ...profile,
            unlocked: undefined,
            isMedical: (profile.subscription === 'medical' || profile.subscription === 'gp'),
            email: userSession.email as string,
            //subscriptionStats
        })

        await unlock(key_pass);

        return get(user);
    } else {
        user.set({
            id: userSession.id,
            auth_id: userSession.id,
            email: userSession.email as string,
            unlocked: undefined
        })
        return null;
    }
}


export function clearUser() {
    console.log('Clearing user');
    user.set(null);
    keyPair.destroy();
}

function getId(): string | null {
    const $user = get(user);
    return $user ? $user.id : null;
}

async function unlock(passphrase: string | null): Promise<boolean> {
    const { update } = user;
    const $user = get(user);
    if (!$user) {
        return false;
    }
    const { key_hash } = $user;
    // check if key matches our hash

    const unlocked = (passphrase) ? await verifyHash(passphrase, key_hash) : false;

    console.log('Unlocking', unlocked);

    if (unlocked) {
        // decrypt keys
        const privateKeyString = await decryptString($user.privateKey, passphrase);
        
        if (!privateKeyString || privateKeyString.indexOf('-----BEGIN PRIVATE KEY-----') !== 0) {
            return false;
        }

        const privateKey = await pemToKey(privateKeyString, true);
        const publicKey = await pemToKey($user.publicKey, false);
        keyPair.set(publicKey, privateKey);
        update((user) => {
            if (user) {

                user.unlocked = unlocked;
            }
            return user;
        })
        return true;
    } else {
        console.log('Unlock failed');
        keyPair.destroy();

        update((user) => {
            if (user) {
                user.unlocked = false;
            }
            return user;
        });
        return false
    }
}

export async function encrypt(data: string): Promise<string> {
    if (!keyPair.isReady()) {
        throw new Error('Keys not available');
    }

    return await keyPair.encrypt(data);
    

/*
    const key = await window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt']
    );
    const keyStr = await exportAESGCMKey(key);
    const keyEnc = await encryptWithPublicKey(keys.publicKey, keyStr);
    const dataEnc = await Promise.all(data.map(async (d) => await encryptWithAESGCM(key, d)));
    return { data: dataEnc, key: keyEnc };*/
}


export async function decrypt(data: string): Promise<string> {
    if (!keyPair.isReady()) {
        throw new Error('Keys not available');
    }
    return await keyPair.decrypt(data);
    /*
    if (!keys.privateKey) {
        throw new Error('Private key not available');
    }
    console.log('Decrypting', keyEnc);
    const key = await decryptWithPrivateKey(keys.privateKey, keyEnc);

    // key is a string, convert it to a CryptoKey
    console.log('Key', key);
    return decryptWithAESGCM(await importAESGCMKey(key), dataEnc);
    */
}

export default {
    keyPair,
    getId,
    ...user,
    ...auth,
    get: () => {
        return get(user);
    },
    set: setUser,
    unlock
};