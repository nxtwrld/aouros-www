import { getClient } from "$slib/supabase";
import  user from "$slib/user";
import { writable, type Writable , get } from 'svelte/store';
import { importKey, exportKey, encrypt as encryptAES, decrypt as decryptAES, prepareKey } from "$slib/encryption/aes";
import { load } from "langchain/load";


export interface DocumentPreload {
    title: string;
    tags: string[];
    key: string;
    [key: string]: any;
    load: () => Promise<Document>;
}

export interface DocumentEncrypted {
    id: string;
    metadata: string;
    keys: {
        key: string;
        owner_id: string;
    }[];
}

export interface Document {
    title: string;
    tags: string[];
    [key: string]: any;
}

const documents: Writable<(DocumentPreload | Document)[]> = writable([]);

export default {
    subscribe: documents.subscribe,
    get: getDocument,
    loadDocument,
    addDocument
}


const byID: {
    [key: string]: DocumentPreload | Document
} = {};


export async function getDocument(id: string): Promise<Document | undefined> {
    await loadingDocuments;
    const document = byID[id];
    if (!document) {
        throw new Error('Document not found');
    }
    if ('load' in document) {
        return await document.load();
    }
    return document;
}

let loadingDocumentsResolve: (value: boolean) => void;
let loadingDocuments: Promise<boolean> = new Promise(resolve => loadingDocumentsResolve = resolve);

export async function loadDocuments(profile_id: string | undefined = undefined): Promise<DocumentEncrypted[]> {
    const user_id = user.getId();
    if (!user_id) {
        return [];
    }
    const supabase = getClient();
    const { data: documents, error } = await supabase.from('documents').select('id, metadata, keys(key, owner_id)')
        .eq('user_id', profile_id || user_id)
        .eq('keys.user_id', user_id)

    if (error) {
        throw error;
    }  


    return documents;
}
    
export async function importDocuments(documentsEncrypted: DocumentEncrypted[] = []) {

    const documentsPreload: DocumentPreload[] = await Promise.all(documentsEncrypted.map(async document => {
        const key = document.keys[0].key;
        const data = await decrypt([document.metadata], key);
        return {
            key,
            id: document.id,
            ...JSON.parse(data[0]),
            load: async () => loadDocument(document.id)
        }
    }));

    documentsPreload.forEach(doc => {
        byID[doc.id] = doc;
    });
    
    documents.set(documentsPreload);
    loadingDocumentsResolve(true);
}


export async function loadDocument(id: string): Promise<Document> {
    const user_id = user.getId();

    let document = byID[id] as DocumentPreload | Document;
    
    if (!document.load) {
        return document;
    }

    if (!user_id) {
        throw new Error('User not logged in');
    }

    // load document contents
    const supabase = getClient();
    const { data, error } = await supabase.from('documents').select('content, keys(key, owner_id)')
        .eq('id', id)
        .eq('keys.user_id', user_id)

    if (error) {
        throw error;
    }

    if (!data[0]) {
        throw new Error('Document not found');
    }
    // decrypt content data
    const documentDecrypted = JSON.parse((await decrypt([ data[0].content], data[0].keys[0].key))[0]);
    
    documents.update(docs => {
        const index = docs.findIndex(doc => doc.id === id);
        if (index >= 0) {
            docs[index] = {
                ...docs[index],
                ...documentDecrypted
            }
            delete docs[index].load;
            document = docs[index] as Document;
            byID[id] = document;
            console.log('Document loaded', docs[index]);
        }
        return docs;
    })


    return document;
}


export async function addDocument(document: Document): Promise<string> {
    const user_id = user.getId();
    if (!user_id) {
        throw new Error('User not logged in');
    }
    const { data: enc, key } = await encrypt([JSON.stringify(document), JSON.stringify({
        title: document.title,
        tags: document.tags
    })]);
        
    const supabase = getClient();
    
    
    const { data, error } = await supabase.from('documents').insert({
        metadata : enc[1],
        content :  enc[0],
        user_id,
    }).select('id');

    if (error) {
        console.log('Error adding document', error);
        throw error;
    }
    console.log('Document added', data);
    
    const { data: keyData, error: keyError } = await supabase.from('keys').insert({
        user_id,
        document_id: data![0].id,
        owner_id: user_id,
        key,
    });

    if(keyError) {
        console.log('Error adding key', keyError);
        // Rollback document insert
        await supabase.from('documents').delete().eq('id', data![0].id);
        throw keyError;
    }
    console.log('Key added', keyData);
    
    return data![0].id;
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


    const keyEncrypted = await user.keyPair.encrypt(keyExported);

    return { data: encrypted, key: keyEncrypted };
}

async function decrypt(data: string[], keyEncrypted: string): Promise<string[]> {

        // decrypt key with user's private key
    const keyDecrypted = await user.keyPair.decrypt(keyEncrypted); 
    const cryptoKey = await importKey(keyDecrypted) as CryptoKey;
    
    // decrypt
    const decrypted = await Promise.all(data.map(d => decryptAES(cryptoKey, d)));

    return decrypted;
}