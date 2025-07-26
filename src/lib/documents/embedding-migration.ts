/**
 * Document Embedding Migration Library
 * 
 * Handles on-demand embedding generation for documents during loading.
 * Keeps the main documents/index.ts clean by separating embedding logic.
 */

import type { Document } from './types.d';
import { updateDocument } from './index';
import { logger } from '$lib/logging/logger';

const embeddingLogger = logger.namespace('DocumentEmdedding');

/**
 * Check if document has embeddings in metadata
 */
export function hasEmbeddings(document: Document): boolean {
  return !!(document.metadata?.embeddings?.vector);
}

/**
 * Extract text content from document for embedding generation
 */
export function extractDocumentContent(document: Document): string {
  let content = '';
  
  // Priority 1: Use localized text if available (user's language)
  if (document.content?.localizedContent && typeof document.content.localizedContent === 'string') {
    content = document.content.localizedContent;
  }
  // Priority 2: Fall back to original content if no localized version
  else if (document.content?.content && typeof document.content.content === 'string') {
    content = document.content.content;
  }
  // Priority 3: Legacy fields for backward compatibility
  else if (document.content?.text && typeof document.content.text === 'string') {
    content = document.content.text;
  }
  else if (document.content?.original && typeof document.content.original === 'string') {
    content = document.content.original;
  }
  else if (document.content?.body && typeof document.content.body === 'string') {
    content = document.content.body;
  }
  // NO JSON.stringify fallback - this would include attachments/thumbnails
  
  // Always prepend title if available (often already translated)
  if (document.content?.title && !content.includes(document.content.title)) {
    content = document.content.title + '\n\n' + content;
  }
  
  // Always append tags for structured metadata
  if (document.content?.tags && Array.isArray(document.content.tags) && document.content.tags.length > 0) {
    content += '\n\nTags: ' + document.content.tags.join(', ');
  }
  
  // Truncate if needed (leave room for API overhead)
  if (content.length > 48000) {
    content = content.substring(0, 48000) + '...';
  }
  
  return content.trim();
}

/**
 * Get the language of the content being embedded
 */
export function getDocumentLanguage(document: Document): string {
  // If we're using localized text, use user's language or metadata language
  if (document.content?.localizedContent && document.content.localizedContent !== document.content?.content) {
    return document.metadata?.userLanguage || document.metadata?.language || 'en';
  }
  // Otherwise use document's original language
  return document.content?.language || document.metadata?.language || 'en';
}

/**
 * Check if document is suitable for embedding generation
 */
export function isDocumentSuitableForEmbedding(document: Document): boolean {
  // Skip documents without content
  if (!document.content) {
    return false;
  }
  
  // Skip profile and health documents (structured data, not text content)
  if (document.type === 'profile' || document.type === 'health') {
    return false;
  }
  
  // Check content length
  const content = extractDocumentContent(document);
  if (content.length < 50) {
    return false;
  }
  
  // Skip certain document types that shouldn't have embeddings
  const skipTypes = ['image', 'video', 'audio', 'binary'];
  if (skipTypes.includes(document.metadata?.type || '')) {
    return false;
  }
  
  return true;
}

/**
 * Generate embeddings for a document via server API
 */
export async function generateEmbeddingsForDocument(document: Document): Promise<{
  summary: string;
  vector: string;
  provider: string;
  model: string;
  timestamp: string;
}> {
  const content = extractDocumentContent(document);
  const language = getDocumentLanguage(document);
  
  if (!content || content.length < 50) {
    throw new Error('Document content too short for embedding generation');
  }
  
  // Log embedding generation details
  embeddingLogger.info('Generating embeddings for document', {
    documentId: document.id,
    contentLength: content.length,
    language: language,
    isLocalized: !!(document.content?.localizedContent && document.content.localizedContent !== document.content?.content),
    hasTitle: !!document.content?.title,
    tagCount: document.content?.tags?.length || 0
  });
  
  const response = await fetch('/v1/embeddings/generate', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId: document.id,
      content,
      type: document.type,
      metadata: {
        language: language,
        title: document.content?.title || document.metadata?.title
      }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to generate embeddings: ${errorData.message || response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(`Embedding generation failed: ${result.message}`);
  }
  
  return result.data;
}

/**
 * Ensure document has embeddings - generate and save if missing
 * This is the main function called by loadDocument
 */
export async function ensureDocumentHasEmbeddings(document: Document): Promise<Document> {
  // Check if document already has embeddings
  if (hasEmbeddings(document)) {
    embeddingLogger.debug('Document already has embeddings', { documentId: document.id });
    return document;
  }
  
  // Check if document is suitable for embedding generation
  if (!isDocumentSuitableForEmbedding(document)) {
    embeddingLogger.debug('Document not suitable for embedding generation', { 
      documentId: document.id,
      type: document.type 
    });
    return document;
  }
  
  try {
    embeddingLogger.info('Generating embeddings for document', { 
      documentId: document.id,
      type: document.type 
    });
    
    // Generate embeddings via server API
    const embeddings = await generateEmbeddingsForDocument(document);
    
    // Create updated document with embeddings in metadata
    const updatedDocument: Document = {
      ...document,
      metadata: {
        ...document.metadata,
        embeddings
      }
    };
    
    // Save document with embeddings to database
    await updateDocument(updatedDocument);
    
    embeddingLogger.info('Successfully added embeddings to document', { 
      documentId: document.id,
      provider: embeddings.provider 
    });
    
    return updatedDocument;
    
  } catch (error) {
    embeddingLogger.warn('Failed to generate embeddings for document', { 
      documentId: document.id,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return original document if embedding generation fails
    return document;
  }
}