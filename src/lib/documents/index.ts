import user from "$lib/user";
import {
  writable,
  type Writable,
  type Readable,
  derived,
  get,
} from "svelte/store";
import {
  importKey,
  exportKey,
  encrypt as encryptAES,
  decrypt as decryptAES,
  prepareKey,
} from "$lib/encryption/aes";
import { pemToKey, encrypt as encryptRSA } from "$lib/encryption/rsa";
import { profile, profiles } from "$lib/profiles";
import Errors from "$lib/Errors";
import type { Profile } from "$lib/types.d";
import {
  DocumentType,
  type DocumentPreload,
  type DocumentEncrypted,
  type Document,
  type DocumentNew,
  type Attachment,
} from "$lib/documents/types.d";
import { base64ToArrayBuffer } from "$lib/arrays";
import { logger } from "$lib/logging/logger";
import { profileContextManager } from "$lib/context/integration/profile-context";
// Removed embedding migration import - now using medical terms classification

const documents: Writable<(DocumentPreload | Document)[]> = writable([]);

export function byUser(id: string): Readable<(DocumentPreload | Document)[]> {
  return profileStores[id];
}

const byID: {
  [key: string]: DocumentPreload | Document;
} = {};

export const profileStores: {
  [key: string]: Readable<(DocumentPreload | Document)[]>;
} = {};

export default {
  subscribe: documents.subscribe,
  get: getDocument,
  byUser,
  loadDocument,
  addDocument,
};

function updateIndex() {
  get(documents).forEach((doc) => {
    byID[doc.id] = doc;
    const user_id = doc.user_id;
    if (!profileStores[user_id]) {
      (() => {
        profileStores[user_id] = derived(documents, ($documents, set) => {
          const userDocuments = $documents.filter(
            (doc) => doc.user_id === user_id && doc.type === "document",
          );
          logger.documents.debug("Update profile store", {
            user_id,
            userDocuments,
          });
          set(userDocuments);
        });
      })();
    }
  });
}

export async function getDocument(id: string): Promise<Document | undefined> {
  await loadingDocuments;
  const document = byID[id];
  if (!document) {
    throw new Error("Document not found");
  }
  if (!document.content) {
    return await loadDocument(id);
  }
  return document as Document;
}

let loadingDocumentsResolve: (value: boolean) => void;
let loadingDocuments: Promise<boolean> = new Promise(
  (resolve) => (loadingDocumentsResolve = resolve),
);

export async function loadDocuments(
  profile_id: string,
): Promise<(DocumentPreload | Document)[]> {
  const documentsResponse = await fetch(
    `/v1/med/profiles/${profile_id}/documents`,
  );
  const result = await documentsResponse.json();
  return await importDocuments(result);
}

export async function importDocuments(
  documentsEncrypted: DocumentEncrypted[] = [],
): Promise<(Document | DocumentPreload)[]> {
  const documentsPreload: (DocumentPreload | Document)[] = await Promise.all(
    documentsEncrypted.map(async (document) => {
      const key = document.keys[0].key;

      const encrypted = [document.metadata];
      if (document.content) {
        encrypted.push(document.content);
      }
      const enc = await decrypt(encrypted, key);

      const parsedMetadata = JSON.parse(enc[0]);
      const embeddings = parsedMetadata.embeddings || {};

      const doc: Document | DocumentPreload = {
        key,
        id: document.id,
        user_id: document.user_id,
        type: document.type,
        metadata: parsedMetadata,
        content: undefined,
        owner_id: document.keys[0].owner_id,
        author_id: document.author_id,
        attachments: document.attachments || [],
        // Extract embedding fields from metadata subsection
        embedding_summary: embeddings.summary,
        embedding_vector: embeddings.vector,
        embedding_provider: embeddings.provider,
        embedding_model: embeddings.model,
        embedding_timestamp: embeddings.timestamp,
      };

      if (enc[1]) {
        // if we have full document data - add content
        doc.content = JSON.parse(enc[1]);
        return doc as Document;
      }
      // add load function
      return doc as DocumentPreload;
    }),
  );

  documents.set(documentsPreload);
  updateIndex();

  loadingDocumentsResolve(true);
  return documentsPreload;
}

export async function loadDocument(
  id: string,
  profile_id: string | null = null,
): Promise<Document> {
  const user_id = user.getId();
  profile_id = profile_id || user_id;
  let document = byID[id] as DocumentPreload | Document;

  if (document && document.content) {
    return document as Document;
  }
  if (document && document.user_id) {
    profile_id = document.user_id;
  }

  if (!user_id) {
    throw new Error(Errors.Unauthenticated);
  }

  const documentEncrypted = await fetch(
    "/v1/med/profiles/" + profile_id + "/documents/" + id,
  )
    .then((r) => r.json())
    .catch((e) => {
      logger.documents.error("Failed to fetch document", { error: e });
      throw new Error(Errors.NetworkError);
    });
  // decrypt content data
  const documentDecrypted = await decrypt(
    [documentEncrypted.metadata, documentEncrypted.content],
    documentEncrypted.keys[0].key,
  );

  documents.update((docs) => {
    const index = docs.findIndex((doc) => doc.id === id);
    if (index < 0) {
      docs.push({
        key: documentEncrypted.keys[0].key,
        id: documentEncrypted.id,
        user_id: documentEncrypted.user_id,
        type: documentEncrypted.type,
        metadata: JSON.parse(documentDecrypted[0]),
        content: JSON.parse(documentDecrypted[1]),
        owner_id: documentEncrypted.keys[0].owner_id,
        author_id: documentEncrypted.author_id,
        attachments: documentEncrypted.attachments || [],
      });
    }
    if (index >= 0) {
      docs[index].content = JSON.parse(documentDecrypted[1]);
      document = docs[index] as Document;
      byID[id] = document;
      logger.documents.info("Document loaded", { document: docs[index] });
    }
    return docs;
  });
  updateIndex();

  // Ensure document has embeddings before returning
  const loadedDocument = byID[id] as Document;
  if (loadedDocument.content) {
    try {
      // Medical terms are now generated during LangGraph workflow processing
      // No need for separate embedding generation step
      const documentWithTerms = loadedDocument;

      // Document is already processed with medical terms
      if (documentWithTerms !== loadedDocument) {
        documents.update((docs) => {
          const index = docs.findIndex((doc) => doc.id === id);
          if (index >= 0) {
            docs[index] = documentWithTerms;
            byID[id] = documentWithTerms;
          }
          return docs;
        });
        updateIndex();
        return documentWithTerms;
      }
    } catch (error) {
      logger.documents.warn("Failed to process document with medical terms", {
        documentId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with original document if medical terms processing fails
    }
  }

  return loadedDocument;
}

export async function updateDocument(documentData: Document) {
  // get current document
  const document = await getDocument(documentData.id);
  if (!document) {
    throw new Error(Errors.DocumentNotFound);
  }
  const user_id = user.getId();
  const key = await user.keyPair.decrypt(document.key);

  // prepare new metadata
  let metadata = deriveMetadata(
    documentData,
    Object.assign(document.metadata, documentData.metadata),
  );

  // encrypt attachments and map them to content with thumbnails
  const attachmentsToEncrypt = (documentData.attachments || [])
    .filter((a) => !a.url)
    .map((a) => {
      return JSON.stringify({
        file: a.file,
        type: a.type,
      });
    });
  const { data: attachmentsEncrypted } = await encrypt(
    attachmentsToEncrypt,
    key,
  );

  logger.documents.debug("Update attachments", { attachmentsEncrypted });
  const attachmentsUrls = await saveAttachements(
    attachmentsEncrypted,
    document.user_id,
  );

  // remap attachments to
  let i = 0;
  logger.documents.debug("Update attachments", { document });
  document.content.attachments = (document.attachments || []).map((a) => {
    const url = a.url || attachmentsUrls[i];
    const path = a.path || attachmentsUrls[i].path;
    i++;
    return {
      url,
      path,
      type: a.type,
      thumbnail: a.thumbnail,
    };
  });

  const { data: enc } = await encrypt(
    [JSON.stringify(documentData.content), JSON.stringify(metadata)],
    key,
  );

  return await fetch(
    "/v1/med/profiles/" + document.user_id + "/documents/" + document.id,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metadata: enc[1],
        content: enc[0],
        attachments: document.content.attachments.map((a) => a.url),
      }),
    },
  )
    .then((r) => r.json())
    .catch(async (e) => {
      logger.documents.error("Failed to update document", { error: e });
      await removeAttachments(attachmentsUrls);
      throw new Error(Errors.NetworkError);
    });
}

/**
 * TODO: Add attachments
 *  - convert files to base64
 *  - encrypt them
 *  - save them to storage XX post them to sercer for server to save them and create references
 */

export async function addDocument(document: DocumentNew): Promise<Document> {
  const user_id = user.getId();
  if (!user_id) {
    throw new Error(Errors.Unauthenticated);
  }

  const profile_id = document.user_id || user_id;

  // prepare metadata
  let metadata = deriveMetadata(document, document.metadata);

  // encrypt attachments and map them to content with thumbnails
  const attachmentsToEncrypt: string[] = (document.attachments || []).map(
    (a) => {
      return JSON.stringify({
        file: a.file,
        type: a.type,
      });
    },
  );
  const { data: attachmentsEncrypted, key } =
    await encrypt(attachmentsToEncrypt);
  // save encrypted attachments
  const attachmentsUrls = await saveAttachements(
    attachmentsEncrypted,
    profile_id,
  );

  // map attachments to content
  document.content.attachments = (document.attachments || []).map((a, i) => {
    return {
      url: attachmentsUrls[i].url,
      path: attachmentsUrls[i].path,
      type: a.type,
      thumbnail: a.thumbnail,
    };
  });
  logger.documents.info("Add document", { document });
  // encrypt document, metadata using the same key as attachments
  const { data: enc } = await encrypt(
    [JSON.stringify(document.content), JSON.stringify(metadata)],
    key,
  );
  const keys = [
    {
      user_id: user_id,
      owner_id: profile_id || user_id,
      key: await user.keyPair.encrypt(key),
    },
  ];

  // if we are saving a document for a another profile, add the key to the profile
  if (profile_id && profile_id !== user_id) {
    try {
      keys.push({
        user_id: profile_id,
        owner_id: profile_id,
        key: await encryptKeyForProfile(key, profile_id),
      });
    } catch (e: any) {
      if (e.message !== Errors.PublicKeyNotFound) {
        throw e;
      }
    }
  }

  // save the report itself
  const data = await fetch(
    "/v1/med/profiles/" + (profile_id || user_id) + "/documents",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: document.type || DocumentType.document,
        metadata: enc[1],
        content: enc[0],
        attachments: attachmentsUrls,
        keys,
      }),
    },
  )
    .then((r) => r.json())
    .catch(async (e) => {
      logger.documents.error("Failed to add document", { error: e });

      await removeAttachments(attachmentsUrls);

      throw new Error(Errors.NetworkError);
    });

  // update local documents
  const newDocument = await loadDocument(data.id, profile_id || user_id);

  // Add document to context (simplified for medical terms system)
  try {
    await profileContextManager.addDocumentToContext(
      profile_id || user_id,
      newDocument,
    );
  } catch (error) {
    logger.documents.warn("Failed to add document to context", {
      documentId: data.id,
      profileId: profile_id || user_id,
      error,
    });
  }

  return newDocument;
}

export async function removeDocument(id: string): Promise<void> {
  const document = await getDocument(id);
  if (!document) {
    throw new Error(Errors.DocumentNotFound);
  }
  const user_id = user.getId();
  const key = await user.keyPair.decrypt(document.key);
  logger.documents.info("Remove document", { document });
  // remove attachments
  if (document?.content?.attachments)
    await removeAttachments(document?.content?.attachments);
  // remove document
  await fetch("/v1/med/profiles/" + document.user_id + "/documents/" + id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((r) => r.json())
    .catch((e) => {
      logger.documents.error("Failed to remove document", { error: e });
      throw new Error(Errors.NetworkError);
    });

  documents.update((docs) => {
    const index = docs.findIndex((doc) => doc.id === id);
    if (index >= 0) {
      docs.splice(index, 1);
    }
    return docs;
  });

  // Remove document from context
  try {
    profileContextManager.removeDocumentFromContext(document.user_id, id);
  } catch (error) {
    logger.documents.warn("Failed to remove document from context", {
      documentId: id,
      profileId: document.user_id,
      error,
    });
  }

  delete byID[id];
  return;
}

async function saveAttachements(
  attachments: string[],
  profile_id: string,
): Promise<Attachment[]> {
  logger.documents.debug("Save attachments to storage", { attachments });
  const user_id = profile_id || user.getId();
  // store attachments
  const urls = await Promise.all(
    attachments.map(async (attachment, i) => {
      const response = await fetch(
        "/v1/med/profiles/" + user_id + "/attachments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file: attachment,
          }),
        },
      );
      const data = await response.json();
      return data;
    }),
  );

  return urls;
}

async function removeAttachments(attachments: Attachment[]): Promise<void> {
  logger.documents.debug("Delete attachments from storage", { attachments });
  await Promise.all(
    attachments.map(async (attachment) => {
      const response = await fetch(
        "/v1/med/profiles/" +
          user.getId() +
          "/attachments?path=" +
          attachment.path,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      return response.json();
    }),
  );

  return;
}

async function downloadAttachement(attachment: {
  file: string;
  type: string;
  url?: string;
  path?: string;
}) {
  const file = base64ToArrayBuffer(attachment.file);
  const blob = new Blob([file], { type: attachment.type });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = a.name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function encrypt(
  data: string[],
  key: CryptoKey | string | undefined = undefined,
): Promise<{ data: string[]; key: string }> {
  let cryptoKey: CryptoKey;
  if (key instanceof CryptoKey) {
    cryptoKey = key;
  } else if (typeof key === "string") {
    cryptoKey = await importKey(key);
  } else {
    // create random key
    cryptoKey = await prepareKey();
  }
  const encrypted = await Promise.all(
    data.map((d) => encryptAES(cryptoKey, d)),
  );
  const keyExported = await exportKey(cryptoKey);

  return { data: encrypted, key: keyExported };
}

export async function encryptKeyForProfile(
  exportedKey: string,
  profile_id: string,
): Promise<string> {
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

export async function decrypt(
  data: string[],
  keyEncrypted: string,
): Promise<string[]> {
  // decrypt key with user's private key
  const keyDecrypted = await user.keyPair.decrypt(keyEncrypted);
  const cryptoKey = (await importKey(keyDecrypted)) as CryptoKey;

  // decrypt
  const decrypted = await Promise.all(
    data.map((d) => decryptAES(cryptoKey, d)),
  );

  return decrypted;
}

function deriveMetadata(
  document: Document | DocumentNew,
  metadata?: { [key: string]: any },
): { [key: string]: any } {
  let result: { [key: string]: any } = {
    title: document.content.title,
    tags: document.content.tags || [],
    date: document.content.date || new Date().toISOString(),
    ...metadata,
  };

  // Include embeddings if available from server analysis
  // Medical terms are now generated during workflow processing
  // No need for separate embedding handling

  return result;
}
