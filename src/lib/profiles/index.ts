import profiles from "./profiles";
import profile from "./profile";

import { importDocuments, addDocument } from "$lib/documents";
import { DocumentType } from "$lib/documents/types.d";
import type { ProfileNew, Profile } from "$lib/types.d";
import user from "$lib/user";
import { prepareKeys } from "$lib/encryption/rsa";
import { createHash } from "$lib/encryption/hash";
import { generatePassphrase } from "$lib/encryption/passphrase";

export { profiles, profile };

/** 1
 *  Removes links between a parent and a profile
 */
export async function removeLinkedParent(profile_id: string) {
  const response = await fetch(
    "/v1/med/profiles/" + profile_id + "?link_type=parent",
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  await loadProfiles(undefined, true);
  return;
}

/**
 *  Removes links between a profile and a parent
 */
export async function removeLinkedProfile(profile_id: string) {
  const response = await fetch("/v1/med/profiles/" + profile_id, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  await loadProfiles(undefined, true);
  return;
}

/**
 *  Load
 */
export async function loadProfiles(
  fetch: any = undefined,
  force: boolean = false,
) {
  /*
    if (!force && profiles.get().length > 0) {
        console.log('profiles already loaded', profiles.get());
        return;
    }
*/
  if (!fetch) fetch = window.fetch;
  // fetch basic profile data
  const profilesLoaded = await fetch("/v1/med/profiles")
    .then((r) => r.json())
    .catch((e) => {
      console.error("Error loading profiles", e);
      return [];
    });

  // extend proifle data with decrypted data
  const profilesExtended = await Promise.all(
    profilesLoaded
      .filter((d) => d.profiles != null)
      .map(async (d) => {
        // fetch encrypted profile and health documents
        try {
          const rootsEncrypted = await fetch(
            `/v1/med/profiles/${d.profiles.id}/documents?types=profile,health&full=true`,
          )
            .then((r) => r.json())
            .catch((e) => {
              console.error("Error loading profile documents", e);
              return [];
            });

          // decrypt documents
          const roots = await importDocuments(rootsEncrypted);

          // map profile data
          return mapProfileData(d, roots);
        } catch (e) {
          return {
            ...d.profiles,
            status: d.status,
            insurance: {},
            health: {},
            vcard: {},
          };
        }
      }),
  );

  // set profiles
  profiles.set(profilesExtended || []);
}

export function updateProfile(p: Profile) {
  profiles.update(p);

  // extend current profile with new data (if it is the same profile)
  let currentProfile = profile.get();
  if (currentProfile?.id === p.id) {
    profile.set({
      ...currentProfile,
      ...p,
    });
  }
}

export function mapProfileData(core, roots) {
  let profile = null,
    health = null,
    profileDocumentId = null,
    healthDocumentId = null;

  roots.forEach((r) => {
    if (r.type === "profile") {
      profile = r.content;
      profileDocumentId = r.id;
    }
    if (r.type === "health") {
      //console.log('health', r);
      health = r.content;
      healthDocumentId = r.id;
    }
    delete r.content.title;
    delete r.content.tags;
  });

  const profileData = {
    ...core.profiles,
    status: core.status,
    profileDocumentId,
    healthDocumentId,
    insurance: {},
    health: {},
    vcard: {},
  };

  if (profile) {
    profileData.vcard = profile.vcard;
    profileData.insurance = profile.insurance;
    profileData.birthDate = profile.birthDate;
  }

  if (health) {
    profileData.health = health;
  }
  return profileData;
}

/**
 * Creat a new virtual profile
 */

export async function createVirtualProfile(profile: ProfileNew) {
  // 2. generate random passphrase
  const key_pass = generatePassphrase();
  const key_hash = await createHash(key_pass);

  // 3. encrypt private key with passphrase
  const keys = await prepareKeys(key_pass);

  console.log("Saving profile", {
    fullName: profile.fullName,
    language: profile.language || user.get()?.language || "en",
    publicKey: keys.publicKeyPEM,
    privateKey: keys.encryptedPrivateKey,
    key_hash: key_hash,
    key_pass: key_pass,
  });

  // 4. submit to server
  const response = await fetch("/v1/med/profiles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fullName: profile.fullName,
      language: profile.language || user.get()?.language || "en",
      publicKey: keys.publicKeyPEM,
      privateKey: keys.encryptedPrivateKey,
      key_hash: key_hash,
      key_pass: key_pass,
    }),
  }).catch((e) => {
    console.error("Error saving profile", e);
    throw new Error("Error saving profile");
  });
  const [profileData] = await response.json();

  //console.log('Profile saved', profileData);

  //console.log('Add profile documnets', profileData.id);
  // 7. update profiles
  await loadProfiles(undefined, true);

  // 5. create profile document if vcard is provided
  await addDocument({
    type: DocumentType.profile,
    content: {
      title: "Profile",
      tags: ["profile"],
      vcard: profile.vcard || {},
      insurance: profile.insurance || {},
    },
    user_id: profileData.id,
  });

  // 6. create a health document
  const healthDocument = {
    ...(profile.health || {}),
  };
  if (profile.birthDate) {
    healthDocument.birthDate = profile.birthDate;
  }

  //console.log('Add health documnets', profileData.id);
  await addDocument({
    type: DocumentType.health,
    content: {
      title: "Health",
      tags: ["health"],
      ...healthDocument,
    },
    user_id: profileData.id,
  });

  // 7. update profiles
  await loadProfiles(undefined, true);

  return profileData;
}
