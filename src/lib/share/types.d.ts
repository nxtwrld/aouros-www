import type { Link } from "$lib/common.types.d";

export interface ShareRecord {
  uid: string;
  title: string;
  href: string;
  url: string;
  contact: string;
  password: string | undefined;
  publicKey: string | undefined;
  created: string;
  links: Link[];
}

/**
 * Share export format
 * Items is list of encrypted items
 * 1. if the items are encrypted with shared PublicKey no salt is needed
 * 2. if we are deriving encryption key from password, salt is needed
 * 3. encryptionPublicKey is needed if we want the shared party to add messages or update our report
 * 4. signingPublicKey is needed if we want the shared party to be able to verify our reports
 * 5. passwordHash is needed if password was set up. This is used to authenticate against the server without access to the password
 */
export interface ShareExport {
  items: ShareItem[];
  salt?: string;
  encryptionPublicKey?: string;
  signingPublicKey?: string;
  passwordHash?: string;
}

export interface ShareItem {
  uid: string;
  type: string;
  key: string;
  data: string;
  metadata: string;
}
