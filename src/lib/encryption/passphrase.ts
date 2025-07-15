const crypto = globalThis.crypto;

// encrypt string with passphrase
export async function encryptString(
  message: string,
  passphrase: string,
): Promise<string> {
  // Convert message and passphrase to ArrayBuffer
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);
  const encodedPassphrase = encoder.encode(passphrase);

  // Derive a key from the passphrase using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encodedPassphrase,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  // Encrypt the message using AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    derivedKey,
    encodedMessage,
  );

  // Convert the encrypted data to Base64 for easy string handling
  const encryptedBytes = new Uint8Array(encrypted);
  const combinedData = new Uint8Array(
    salt.length + iv.length + encryptedBytes.length,
  );
  combinedData.set(salt);
  combinedData.set(iv, salt.length);
  combinedData.set(encryptedBytes, salt.length + iv.length);

  return btoa(String.fromCharCode(...combinedData));
}

export async function decryptString(
  encryptedData: string,
  passphrase: string,
): Promise<string> {
  // Decode the Base64 input back to a Uint8Array
  const combinedData = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((char) => char.charCodeAt(0)),
  );

  // Extract salt, IV, and the actual encrypted message
  const salt = combinedData.slice(0, 16);
  const iv = combinedData.slice(16, 28);
  const encryptedMessage = combinedData.slice(28);

  // Convert passphrase to ArrayBuffer
  const encoder = new TextEncoder();
  const encodedPassphrase = encoder.encode(passphrase);

  // Derive a key from the passphrase using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encodedPassphrase,
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  // Decrypt the message using AES-GCM
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    derivedKey,
    encryptedMessage,
  );

  // Decode the decrypted ArrayBuffer to a string
  return new TextDecoder().decode(decrypted);
}

export function generatePassphrase(length: number = 10): string {
  console.log("generatePassphrase", length);
  const regx = new RegExp(/\d/, "g");
  let p = window.crypto
    .getRandomValues(new BigUint64Array(length))
    .reduce(
      (prev, curr, index) =>
        (!index ? prev : prev.toString(36)) +
        (index % 2
          ? curr
              .toString(36)
              .toUpperCase()
              .replace(regx, (key) => ".,:;-_()=*".charAt(parseInt(key)))
          : curr.toString(36)),
      "",
    )
    .split("")
    .sort(() => 128 - window.crypto.getRandomValues(new Uint8Array(1))[0])
    .join("");
  return p;
}
