import { writable, type Writable, get, type Updater} from "svelte/store";
import { getClient } from "$slib/supabase";
import type { VCard } from '$lib/contact/types.d';
import auth from '$slib/auth';
import { decryptString } from "./encryption/passphrase";
import { verifyHash } from "./encryption/hash";
import { KeyPair, pemToKey } from "./encryption/rsa";

type User = {
    email: string;
    id: string;
    auth_id: string;
    fullName: string;
    avatarUrl: string;
    birthDate: string;
    vcard: VCard;
    health: Record<string, any>;
    subscription: string;
    insurance:{
        number: string;
        provider: string;
    };
    privateKey: string;
    publicKey: string;
    key_hash: string;
    unlocked: boolean | undefined;
}

const keys : {
    privateKey?: CryptoKey;
    publicKey?: CryptoKey;
} = {};

let keyPair: KeyPair = new KeyPair();

const user: Writable<User | null> = writable(null);

user.subscribe((value) => {
    if (!value) {
        delete keys.privateKey;
        delete keys.publicKey;
    }
});

export async function loadUser(): Promise<User | null> {
    const supabase = getClient();

    const { data: { user: userSession }, error: userError } = await supabase.auth.getUser();
    if (userError || !userSession) {
        throw userError;
    }

    const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`fullName, birthDate, vcard, health, insurance, subscription, privateKey, publicKey, avatarUrl, key_hash, auth_id, id`)
    .eq('auth_id', userSession?.id)
    .single()

    console.log('loadUser');
    if (profile && profile.fullName) {
        user.set({
            ...profile,
            health: JSON.parse(profile.health),
            insurance: JSON.parse(profile.insurance),
            vcard: JSON.parse(profile.vcard),
            unlocked: undefined,
            isMedical: (profile.subscription === 'medical' || profile.subscription === 'gp'),
            email: userSession.email,
        })

        unlock(userSession.id);
    } else {
        user.set({
            id: userSession.id,
            email: userSession.email,
        })
    }

    return profile;

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

async function unlock(passphrase: string): Promise<boolean> {
    const { update } = user;
    const $user = get(user);
    if (!$user) {
        return false;
    }
    const { key_hash } = $user;
    // check if key matches our hash
    const unlocked = await verifyHash(passphrase, key_hash);

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
    unlock
};