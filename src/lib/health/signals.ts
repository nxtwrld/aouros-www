import { type Signal } from "$lib/types.d";
import { getDocument, updateDocument } from "$lib/documents";
import { type Document } from "$lib/documents/types.d";
import { profiles, updateProfile } from "$lib/profiles";
import { type Profile } from "$lib/types.d";
import { SignalDataMigration } from "$lib/signals/migration";

/**
 * Enhanced getHealthDocument with automatic signal migration
 */
export async function getHealthDocument(profileId: string): Promise<Document> {
  const profile = (await profiles.get(profileId)) as Profile;
  let document = (await getDocument(profile.healthDocumentId)) as Document;

  // Check and perform signal migration if needed
  document = await SignalDataMigration.checkAndMigrate(document);

  return document;
}

export async function updateSignals(
  signals: Signal[],
  user_id: string,
  refId: string = "input",
) {
  // 1. get users health profile document with migration
  let document = await getHealthDocument(user_id);
  let contentSignals = document.content.signals || {};

  // 2. update / create signal value and update signals history
  signals.forEach((signal) => {
    signal.refId = signal.refId || refId;
    if (!contentSignals[signal.signal]) {
      contentSignals[signal.signal] = {
        log: "full",
        history: [],
        values: [],
      };
    }
    contentSignals[signal.signal].values = [
      ...contentSignals[signal.signal].values,
      {
        ...signal,
      },
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  console.log("contentSignals", contentSignals);
  document.content.signals = contentSignals;
  console.log("document", document);

  // 3. update document
  await updateDocument(document);

  // 4. update profile
  const profile = (await profiles.get(user_id)) as Profile;
  profile.health.signals = contentSignals;
  updateProfile(profile);
}
