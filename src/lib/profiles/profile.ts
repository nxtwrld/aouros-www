import { writable, type Writable, get } from "svelte/store";
import { type Profile } from "$lib/types.d";
import type { ChatContext, PageContext } from "$lib/chat/types.d";
import { generateId } from "$lib/utils/id";
import ui from "$lib/ui";

const store: Writable<Profile> = writable();

/**
 * Creates a chat context from the current profile data
 * This provides a centralized method for converting profile data to chat context
 */
function createChatContext(
  profileId: string,
  profileName: string,
  isOwnProfile: boolean,
  language: string,
  currentRoute: string = "/",
  healthData?: any,
  healthDocumentId?: string,
): ChatContext {
  // Get cached document data if available (for consistency with existing behavior)
  const documentEvent = ui.getLatest("aicontext:document");
  const documentData = documentEvent?.data;

  // Build available documents list including health document
  const availableDocuments = [];
  const documentsContent = new Map();

  // Add cached document if available
  if (documentData) {
    availableDocuments.push(documentData.documentId);
    documentsContent.set(documentData.documentId, documentData.content);
  }

  // Add health document if available
  if (healthDocumentId && healthData) {
    availableDocuments.push(healthDocumentId);
    documentsContent.set(healthDocumentId, healthData);
  }

  const pageContext: PageContext = {
    route: currentRoute,
    profileName: profileName,
    availableData: {
      documents: availableDocuments,
      conditions: [],
      medications: [],
      vitals: [],
    },
    documentsContent: documentsContent.size > 0 ? documentsContent : undefined,
  };

  return {
    mode: isOwnProfile ? "patient" : "clinical",
    currentProfileId: profileId,
    conversationThreadId: generateId(),
    language: language,
    pageContext: pageContext,
    isOwnProfile: isOwnProfile,
  };
}

export default {
  ...store,
  get: () => get(store),
  createChatContext,
};
