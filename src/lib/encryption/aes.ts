import { arrayBufferToBase64 } from "$lib/arrays";

const crypto = globalThis.crypto;

// Function to export an AES key to a Base64 string
export async function exportKey(key: CryptoKey): Promise<string> {
  const exportedKey = await crypto.subtle.exportKey("raw", key);
  const exportedKeyArray = new Uint8Array(exportedKey);
  return btoa(String.fromCharCode(...exportedKeyArray));
}

// Function to import a Base64-encoded AES key string back to a CryptoKey
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyBytes = Uint8Array.from(atob(keyString), (char) =>
    char.charCodeAt(0),
  );
  return await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer,
    { name: "AES-GCM", length: 256 },
    true, // Whether the key is extractable (allows re-exporting)
    ["encrypt", "decrypt"],
  );
}

// Encrypt function using AES-GCM with a given CryptoKey
export async function encrypt(
  aesKey: CryptoKey,
  message: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);

  // Generate a random IV (Initialization Vector)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the message
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    encodedMessage,
  );

  // Combine IV and encrypted message into a single array for easy storage/transmission
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const combinedData = new Uint8Array(iv.length + encryptedBytes.length);
  combinedData.set(iv);
  combinedData.set(encryptedBytes, iv.length);

  // Convert combined data to a Base64 string
  return arrayBufferToBase64(combinedData);
  //return btoa(String.fromCharCode(...combinedData));
}

// Decrypt function using AES-GCM with a given CryptoKey
export async function decrypt(
  aesKey: CryptoKey,
  encryptedData: string,
): Promise<string> {
  // Decode the Base64-encoded data
  const combinedData = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((char) => char.charCodeAt(0)),
  );

  // Extract the IV and encrypted message
  const iv = combinedData.slice(0, 12); // First 12 bytes for IV
  const encryptedBytes = combinedData.slice(12); // Remaining bytes are the encrypted message

  // Decrypt the message
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    encryptedBytes,
  );

  // Decode the decrypted ArrayBuffer to a string
  return new TextDecoder().decode(decryptedBuffer);
}

export async function prepareKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
  return key;
}
