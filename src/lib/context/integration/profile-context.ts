/**
 * Profile Context Integration
 * 
 * Integrates context initialization with the profile loading system.
 * This ensures context is available immediately when profiles are loaded.
 */

import { contextInitializer } from '../client-database/initialization';
import { clientEmbeddingManager } from '../embeddings/client-embedding-manager';
import { byUser } from '$lib/documents';
import type { Document, DocumentPreload } from '$lib/documents/types.d';
import { get } from 'svelte/store';
import user from '$lib/user';
import { logger } from '$lib/logging/logger';

export class ProfileContextManager {
  private initializationPromises = new Map<string, Promise<void>>();
  
  /**
   * Initialize context for a profile using documents from memory
   * This avoids duplicate document loading by using already-loaded documents
   */
  async initializeProfileContext(
    profileId: string,
    options: {
      forceRebuild?: boolean;
      onProgress?: (status: string, progress?: number) => void;
    } = {}
  ): Promise<void> {
    // Prevent concurrent initialization for same profile
    if (this.initializationPromises.has(profileId) && !options.forceRebuild) {
      return this.initializationPromises.get(profileId)!;
    }
    
    // Get documents from memory instead of loading them again
    const documentsFromMemory = get(byUser(profileId));
    
    if (documentsFromMemory.length === 0) {
      logger.namespace('ProfileContext').warn('No documents found in memory for profile context initialization', { 
        profileId 
      });
      // Documents should already be loaded at this point
      // If not, something went wrong in the loading process
      return;
    }
    
    const initPromise = this.performInitializationWithDocuments(profileId, documentsFromMemory, options);
    this.initializationPromises.set(profileId, initPromise);
    
    try {
      await initPromise;
    } finally {
      this.initializationPromises.delete(profileId);
    }
  }
  
  /**
   * Initialize context with already-loaded documents
   * This avoids the need to reload documents and prevents SSR fetch issues
   */
  async initializeWithDocuments(
    profileId: string,
    documents: (Document | DocumentPreload)[],
    options: {
      forceRebuild?: boolean;
      onProgress?: (status: string, progress?: number) => void;
    } = {}
  ): Promise<void> {
    // Prevent concurrent initialization for same profile
    if (this.initializationPromises.has(profileId) && !options.forceRebuild) {
      return this.initializationPromises.get(profileId)!;
    }
    
    const initPromise = this.performInitializationWithDocuments(profileId, documents, options);
    this.initializationPromises.set(profileId, initPromise);
    
    try {
      await initPromise;
    } finally {
      this.initializationPromises.delete(profileId);
    }
  }
  
  /**
   * Perform the actual context initialization with already-loaded documents
   */
  private async performInitializationWithDocuments(
    profileId: string,
    documents: (Document | DocumentPreload)[],
    options: {
      forceRebuild?: boolean;
      generateMissingEmbeddings?: boolean;
      onProgress?: (status: string, progress?: number) => void;
    }
  ): Promise<void> {
    try {
      const startTime = performance.now();
      
      logger.namespace('ProfileContext').info('Starting profile context initialization with documents', { 
        profileId,
        documentCount: documents.length
      });
      options.onProgress?.('Processing documents...', 10);
      
      // 1. Get user keys for decryption
      const userKeys = user.keyPair;
      if (!userKeys) {
        throw new Error('User keys not available');
      }
      
      // 2. Filter documents suitable for embeddings
      options.onProgress?.('Analyzing documents...', 20);
      const suitableDocuments = await this.filterSuitableDocuments(
        documents.filter(doc => doc.content !== undefined) as Document[]
      );
      
      logger.namespace('ProfileContext').debug('Filtered suitable documents', {
        profileId,
        total: documents.length,
        suitable: suitableDocuments.length
      });
      
      // 3. Extract existing embeddings from documents  
      if (suitableDocuments.length > 0) {
        options.onProgress?.('Processing existing embeddings...', 30);
        
        const existingEmbeddings = this.extractExistingEmbeddings(suitableDocuments);
        
        logger.namespace('ProfileContext').info('Extracted existing embeddings from documents', {
          profileId,
          embeddingCount: existingEmbeddings.length,
          totalDocuments: suitableDocuments.length
        });
        
        // Initialize client embedding manager with existing embeddings
        if (existingEmbeddings.length > 0) {
          await clientEmbeddingManager.initialize(existingEmbeddings);
        }
        
        options.onProgress?.('Embeddings processed', 70);
      }
      
      // 4. Initialize context database
      options.onProgress?.('Building context database...', 80);
      
      const { database } = await contextInitializer.initializeContext(
        profileId,
        documents.filter(doc => doc.content !== undefined) as Document[],
        userKeys,
        {
          maxMemoryMB: 50,
          documentTypes: ['document'] // Focus on actual documents, not profile/health
        }
      );
      
      // 5. Log completion statistics
      const stats = database.getStats();
      const initTime = performance.now() - startTime;
      
      logger.namespace('ProfileContext').info('Profile context initialization completed', {
        profileId,
        ...stats,
        initTimeMs: initTime.toFixed(2)
      });
      
      options.onProgress?.('Context ready', 100);

      // Note: Embedding generation now happens automatically during document loading
      // via the loadDocument function, so no separate migration step is needed
      
    } catch (error) {
      logger.namespace('ProfileContext').error('Failed to initialize profile context', {
        profileId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      options.onProgress?.('Context initialization failed', 0);
      throw error;
    }
  }
  
  /**
   * Filter documents that are suitable for embedding generation
   */
  private async filterSuitableDocuments(documents: Document[]): Promise<Document[]> {
    const suitable: Document[] = [];
    
    for (const doc of documents) {
      // Only process 'document' type (not 'profile' or 'health')
      if (doc.type !== 'document') {
        continue;
      }
      
      // Check if document is suitable for embedding
      if (this.isDocumentSuitableForEmbedding(doc)) {
        suitable.push(doc);
      }
    }
    
    return suitable;
  }
  
  /**
   * Update context when a new document is added to a profile
   */
  async addDocumentToContext(
    profileId: string,
    document: Document,
    options: {
      generateEmbedding?: boolean;
    } = {}
  ): Promise<void> {
    try {
      // Check if context exists for this profile
      const existingContext = contextInitializer.getContext(profileId);
      if (!existingContext) {
        logger.namespace('ProfileContext').warn('Context not initialized for profile', { profileId });
        return;
      }
      
      // Note: Embedding generation now happens server-side during document processing
      // Here we just add the document's existing embedding to the client cache if it has one
      if (options.generateEmbedding && this.isDocumentSuitableForEmbedding(document)) {
        const existingEmbedding = this.extractDocumentEmbedding(document);
        if (existingEmbedding) {
          clientEmbeddingManager.addEmbedding(existingEmbedding);
          logger.namespace('ProfileContext').debug('Added document embedding to client cache', {
            documentId: document.id
          });
        }
      }
      
      // Add document to existing context
      const userKeys = user.keyPair;
      if (userKeys) {
        await contextInitializer.addDocumentToContext(
          profileId,
          document,
          userKeys
        );
        
        logger.namespace('ProfileContext').info('Added document to context', {
          profileId,
          documentId: document.id
        });
      }
      
    } catch (error) {
      logger.namespace('ProfileContext').error('Failed to add document to context', {
        profileId,
        documentId: document.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Remove document from context when deleted
   */
  removeDocumentFromContext(profileId: string, documentId: string): void {
    try {
      contextInitializer.removeDocumentFromContext(profileId, documentId);
      
      logger.namespace('ProfileContext').info('Removed document from context', {
        profileId,
        documentId
      });
      
    } catch (error) {
      logger.namespace('ProfileContext').error('Failed to remove document from context', {
        profileId,
        documentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Clear context for a profile
   */
  clearProfileContext(profileId: string): void {
    try {
      contextInitializer.clearContext(profileId);
      
      logger.namespace('ProfileContext').info('Cleared profile context', { profileId });
      
    } catch (error) {
      logger.namespace('ProfileContext').error('Failed to clear profile context', {
        profileId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Get context statistics for a profile
   */
  getProfileContextStats(profileId: string) {
    const context = contextInitializer.getContext(profileId);
    if (!context) {
      return null;
    }
    
    return context.database.getStats();
  }
  
  /**
   * Get overall memory statistics across all profiles
   */
  getOverallMemoryStats() {
    return contextInitializer.getMemoryStats();
  }
  
  /**
   * Optimize memory usage across all contexts
   */
  optimizeMemory(): void {
    contextInitializer.optimizeMemory();
  }

  /**
   * Check if document is suitable for embedding generation
   */
  private isDocumentSuitableForEmbedding(document: Document): boolean {
    // Check document type
    if (document.type === 'profile' || document.type === 'health') {
      return false; // These are structured data, not text content
    }
    
    // Check if document has meaningful content
    const summary = this.generateDocumentSummary(document);
    return !!(summary && summary.length >= 50); // Minimum content length
  }

  /**
   * Generate document summary for embedding
   */
  private generateDocumentSummary(document: Document): string {
    if (!document.content) {
      return document.metadata?.title || '';
    }
    
    const content = document.content;
    const parts: string[] = [];
    
    // Add title
    if (content.title) {
      parts.push(content.title);
    }
    
    // Add metadata title if different
    if (document.metadata?.title && document.metadata.title !== content.title) {
      parts.push(document.metadata.title);
    }
    
    // Add tags
    if (content.tags && content.tags.length > 0) {
      parts.push(`Tags: ${content.tags.join(', ')}`);
    }
    
    // Add main content based on type
    if (content.localizedContent) {
      parts.push(content.localizedContent);
    } else if (content.content) {
      parts.push(content.content);
    } else if (content.text) {
      parts.push(content.text);
    } else if (content.body) {
      parts.push(content.body);
    } else if (content.description) {
      parts.push(content.description);
    }
    
    // Combine and clean up
    let summary = parts.join('\n\n').trim();
    
    // Remove excessive whitespace
    summary = summary.replace(/\s+/g, ' ');
    
    // Truncate if too long
    const maxLength = 1000;
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength) + '...';
    }
    
    return summary;
  }

  /**
   * Extract embedding data from documents that have embeddings
   */
  private extractExistingEmbeddings(documents: Document[]): any[] {
    const embeddings: any[] = [];
    
    for (const doc of documents) {
      const embeddingData = this.extractDocumentEmbedding(doc);
      if (embeddingData) {
        embeddings.push(embeddingData);
      }
    }
    
    return embeddings;
  }

  /**
   * Extract embedding data from a single document
   */
  private extractDocumentEmbedding(document: Document): any | null {
    // Check if document has embedding metadata in new structure
    const embeddings = document.metadata?.embeddings;
    if (!embeddings?.vector || !embeddings?.summary) {
      return null;
    }
    
    try {
      // Parse embedding vector (assuming it's stored as JSON array)
      const vectorData = JSON.parse(embeddings.vector);
      const vector = new Float32Array(vectorData);
      
      return {
        documentId: document.id,
        vector,
        summary: embeddings.summary,
        metadata: {
          provider: embeddings.provider || 'unknown',
          model: embeddings.model || 'unknown',
          dimensions: vector.length,
          language: document.metadata.language || 'en',
          documentType: document.type,
          processingDate: embeddings.timestamp || new Date().toISOString()
        }
      };
    } catch (error) {
      logger.namespace('ProfileContext').warn('Failed to extract embedding from document', {
        documentId: document.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }
}

// Export singleton instance
export const profileContextManager = new ProfileContextManager();