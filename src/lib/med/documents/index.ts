import  user from "$lib/user";
import { writable, type Writable , type Readable, derived, get } from 'svelte/store';
import { importKey, exportKey, encrypt as encryptAES, decrypt as decryptAES, prepareKey } from "$lib/encryption/aes";
import { pemToKey, encrypt as encryptRSA } from "$lib/encryption/rsa";
import { profiles } from '$lib/med/profiles';
import Errors from '$lib/Errors';
import type { Profile } from "$lib/med/types.d";
import { DocumentType, type DocumentPreload, type DocumentEncrypted, type Document, type DocumentNew } from '$lib/med/documents/types.d';

const documents: Writable<(DocumentPreload | Document)[]> = writable([])

export function byUser(id: string): Readable<(DocumentPreload | Document)[]> {
    return profileStores[id];
}

export const profileStores: {
    [key: string]: Readable<(DocumentPreload | Document)[]>
} = {};

export default {
    subscribe: documents.subscribe,
    get: getDocument,
    byUser,
    loadDocument,
    addDocument
}


const byID: {
    [key: string]: DocumentPreload | Document
} = {};



function updateIndex() {
    get(documents).forEach(doc => {
        byID[doc.id] = doc;
        if (!profileStores[doc.user_id]) {
            profileStores[doc.user_id] = derived(documents, ($documents, set) => {
                const userDocuments = $documents.filter(doc => 
                    doc.user_id === doc.user_id
                    && doc.type === 'document'
                );
                set(userDocuments);
            });
        }

    })
}

export async function getDocument(id: string): Promise<Document | undefined> {
    await loadingDocuments;
    const document = byID[id];
    if (!document) {
        throw new Error('Document not found');
    }
    if (!document.content) {
        return await loadDocument(id);
    }
    return document as Document;
}

let loadingDocumentsResolve: (value: boolean) => void;
let loadingDocuments: Promise<boolean> = new Promise(resolve => loadingDocumentsResolve = resolve);

    
export async function importDocuments(documentsEncrypted: DocumentEncrypted[] = []): Promise<DocumentPreload[]> {


        const documentsPreload: (DocumentPreload | Document)[] = 
            await Promise.all(documentsEncrypted.map(async document => {
                const key = document.keys[0].key;


                const encrypted = [document.metadata];
                if (document.content) {
                    encrypted.push(document.content);
                }
                const enc = await decrypt(encrypted, key);


                const doc: Document | DocumentPreload  =  {
                    key,
                    id: document.id,
                    user_id: document.user_id,
                    type: document.type,
                    metadata: JSON.parse(enc[0]),
                    content: undefined,
                    owner_id: document.keys[0].owner_id,
                    author_id: document.author_id,
                    attachments: document.attachments || []

                }

                if (enc[1]) {
                    // if we have full document data - add content
                    doc.content = JSON.parse(enc[1]);
                    return doc as Document;
                } 
                // add load function
                return doc as DocumentPreload;
            })
        );

        
        documents.set(documentsPreload);
        updateIndex();
        
        loadingDocumentsResolve(true);
        return documentsPreload
}



export async function loadDocument(id: string, profile_id: string | undefined = undefined)
    : Promise<Document> {
    const user_id = user.getId();

    let document = byID[id] as DocumentPreload | Document;
    
    if (document.content) {
        return document as Document;
    }

    if (!user_id) {
        throw new Error(Errors.Unauthenticated);
    }

    const documentEncrypted = await fetch('/v1/med/profiles/' + (user_id || profile_id) + '/documents/' + id)
        .then(r => r.json()).catch(e => {
            console.error(e);
            throw new Error(Errors.NetworkError);
        });
    // decrypt content data
    const documentDecrypted = JSON.parse((await decrypt([documentEncrypted.content], documentEncrypted.keys[0].key))[0]);
    
    documents.update(docs => {
        const index = docs.findIndex(doc => doc.id === id);
        if (index >= 0) {
            docs[index].content = documentDecrypted;
            document = docs[index] as Document;
            byID[id] = document;
            console.log('Document loaded', docs[index]);
        }
        return docs;
    })


    return document as Document;
}


export async function updateDocument(id: string, documentData: Document) {
    // get current document
    const document = await getDocument(id);
    if (!document) {
        throw new Error(Errors.DocumentNotFound);
    }
    const user_id = user.getId();
    const key = document.key;

    let metadata = deriveMetadata(documentData, documentData.metadata);

    const attachmentsToEncrypt = (documentData.attachments || []).filter(a => a.startsWith('data:'))

    const { data: enc } = await encrypt([JSON.stringify(documentData.content), JSON.stringify(documentData.metadata), ...attachmentsToEncrypt], key);
    
    const attachments = await saveAttachements(enc.slice(2));

    return await fetch('/v1/med/profiles/' + user_id + '/documents/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            metadata: enc[1],
            content: enc[0],
            attachments
        })
    }).then(r => r.json()).catch(async (e) => {
        console.error(e);
        await deleteAttachments(attachments);
        throw new Error(Errors.NetworkError);
    });


}


/**
 * TODO: Add attachments 
 *  - convert files to base64
 *  - encrypt them
 *  - save them to storage XX post them to sercer for server to save them and create references
 */

export async function addDocument(document: DocumentNew): Promise<string> {

    const user_id = user.getId();
    if (!user_id) {
        throw new Error(Errors.Unauthenticated);
    }
    

    const profile_id = document.user_id || user_id;

    let metadata = deriveMetadata(document, document.metadata);
    

    // encrypt document, metadata and attachments
    const { data: enc, key } = await encrypt([JSON.stringify(document.content), JSON.stringify(metadata), ...(document.attachments || [])]);
    const keys = [{
        user_id: user_id,
        owner_id: profile_id || user_id,
        key: await user.keyPair.encrypt(key),
    }];


    // if we are saveing a document for a profile, add the key to the profile
    if (profile_id && profile_id !== user_id) {
        try { 
            keys.push({
                user_id: profile_id,
                owner_id: profile_id,
                key:  await encryptKeyForProfile(key, profile_id),
            });
        } catch (e: any) {
            if (e.message !== Errors.PublicKeyNotFound) {
                throw e;
            }
        }

    }
    // handle encrypted attachments
    const attachments = await saveAttachements(enc.slice(2));


    const data = await fetch('/v1/med/profiles/' + (profile_id || user_id) + '/documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: document.type || DocumentType.document,
                metadata: enc[1],
                content: enc[0],
                attachments,
                keys
            })
        })
        .then(r => r.json())
        .catch(async (e) => {
            console.error(e);

            await deleteAttachments(attachments);

            throw new Error(Errors.NetworkError);
        });

    return data.id;
}


async function saveAttachements(attachments: string[]): Promise<string[]> {
    // TODO: save attachments to storage
    // TODO: remap attachments to references
    console.log('TODO: save attachments to storage', attachments);
    return attachments;
}

async function deleteAttachments(attachments: string[]): Promise<void> {
    // TODO: delete attachments from storage
    console.log('TODO: delete attachments from storage', attachments);
}


async function encrypt(data: string[], key: CryptoKey | string | undefined = undefined): Promise<{ data: string[], key: string}> {
    let cryptoKey: CryptoKey
    if (key instanceof CryptoKey) {
        cryptoKey = key;
    } else if (typeof key === 'string') {
        cryptoKey = await importKey(key);
    } else {
        // create random key
        cryptoKey = await prepareKey();
    }
    const encrypted = await Promise.all(data.map(d => encryptAES(cryptoKey, d)));
    const keyExported = await exportKey(cryptoKey);




    return { data: encrypted, key: keyExported };
}




async function encryptKeyForProfile(exportedKey: string, profile_id: string): Promise<string> {

    const profile = profiles.get(profile_id) as Profile;

    if (!profile) {
        throw new Error(Errors.ProfileNotFound);
    }

    if (!profile.publicKey) {
        throw new Error(Errors.PublicKeyNotFound);
    }
        
    const profile_key = await pemToKey(profile.publicKey);
    const keyEncrypted = await encryptRSA(profile_key, exportedKey);
    return keyEncrypted;
}


async function decrypt(data: string[], keyEncrypted: string): Promise<string[]> {

        // decrypt key with user's private key
    const keyDecrypted = await user.keyPair.decrypt(keyEncrypted); 
    const cryptoKey = await importKey(keyDecrypted) as CryptoKey;
    
    // decrypt
    const decrypted = await Promise.all(data.map(d => decryptAES(cryptoKey, d)));

    return decrypted;
}




function deriveMetadata(document: Document | DocumentNew, metadata?: { [key: string]: any }): { [key: string]: any } {
    let result = { 
        ...metadata,
        title: document.content.title,
        tags: document.content.tags || []
     };
    return result;
}
