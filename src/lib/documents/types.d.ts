export enum DocumentType {
  "profile" = "profile",
  "document" = "document",
  "health" = "health",
}

export enum DocumentState {
  NEW = "NEW",
  ASSESSING = "ASSESSING",
  ASSESSED = "ASSESSED",
  PROCESSING = "PROCESSING",
  PROCESSED = "PROCESSED",
  ERROR = "ERROR",
  NONMEDICAL = "NONMEDICAL",
  CANCELED = "CANCELED",
}

export interface DocumentPreload {
  id: string;
  key: string;
  type: DocumentType;
  user_id: string;
  metadata: {
    title: string;
    tags: string[];
    [key: string]: any;
  };
  content?: string | undefined;
  author_id?: string;
  owner_id: string;
}

export interface DocumentEncrypted {
  id: string;
  metadata: string;
  content?: string;
  attachments?: string[];
  type: DocumentType;
  user_id: string;
  keys: { key: string; owner_id: string }[];
  author_id?: string;
  owner_id: string;
}

export interface Document {
  type: DocumentType;
  id: string;
  key: string;
  user_id: string;
  metadata: {
    title: string;
    tags: string[];
    [key: string]: any;
  };
  content: {
    title: string;
    tags: string[];
    [key: string]: any;
  };
  attachments: Attachment[];
  author_id?: string;
  owner_id: string;
}

export interface DocumentNew {
  type: DocumentType;
  metadata?: {
    [key: string]: any;
  };
  content: {
    title: string;
    tags: string[];
    [key: string]: any;
  };
  attachments?: Attachment[];
  user_id?: string;
}

export interface Attachment {
  path: string;
  url: string;
  type?: string;
  thumbnail?: string;
  file?: string; // Base64 encoded file data
}
