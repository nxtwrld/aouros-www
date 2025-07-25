/**
 * Context Database Initialization
 * 
 * Handles loading, decrypting, and populating the client-side
 * context database for fast embedding search.
 */

import { ClientContextDatabase } from './memory-store';
import { VectorSearch } from './vector-search';
import type { Document } from '$lib/documents/types.d';
import type { DocumentEmbedding, EmbeddingMetadata } from '../types';
import { decrypt as decryptAES } from '$lib/encryption/aes';
import { logger } from '$lib/logging/logger';

export class ContextInitializer {
  private contextDatabases = new Map<string, ClientContextDatabase>();
  private vectorSearches = new Map<string, VectorSearch>();
  
  /**
   * Initialize context database for a user/session
   */
  async initializeContext(
    userId: string,
    userDocuments: Document[],
    userKeys: CryptoKeyPair,
    options: {
      maxMemoryMB?: number;
      preloadAll?: boolean;
      documentTypes?: string[];
    } = {}
  ): Promise<{ database: ClientContextDatabase; search: VectorSearch }> {
    const startTime = performance.now();
    
    logger.context?.info('Initializing context database', {
      userId,
      documentCount: userDocuments.length,
      options
    });
    
    // Create database instance
    const database = new ClientContextDatabase(options.maxMemoryMB || 50);
    
    // Filter documents with embeddings
    const documentsWithEmbeddings = userDocuments.filter(doc => 
      this.hasEmbedding(doc) && 
      (!options.documentTypes || options.documentTypes.includes(doc.type))
    );
    
    logger.context?.debug('Found documents with embeddings', {
      total: userDocuments.length,
      withEmbeddings: documentsWithEmbeddings.length
    });
    
    if (documentsWithEmbeddings.length === 0) {
      const search = new VectorSearch(database);
      this.contextDatabases.set(userId, database);
      this.vectorSearches.set(userId, search);
      
      return { database, search };
    }
    
    // Decrypt embeddings in parallel batches
    const batchSize = 10; // Process in batches to avoid overwhelming
    const batches = this.chunkArray(documentsWithEmbeddings, batchSize);
    
    for (const batch of batches) {
      const decryptionPromises = batch.map(async (doc) => {
        try {
          return await this.decryptDocumentEmbedding(doc, userKeys);
        } catch (error) {
          logger.context?.error('Failed to decrypt embedding', {
            documentId: doc.id,
            error: error.message
          });
          return null;
        }
      });
      
      const decryptedBatch = await Promise.all(decryptionPromises);
      const validEmbeddings = decryptedBatch.filter(e => e !== null);
      
      // Add to database
      database.addBatch(validEmbeddings as DocumentEmbedding[]);
      
      logger.context?.debug('Processed embedding batch', {
        batchSize: batch.length,
        successful: validEmbeddings.length
      });
    }
    
    // Create vector search instance
    const search = new VectorSearch(database);
    
    // Cache for reuse
    this.contextDatabases.set(userId, database);
    this.vectorSearches.set(userId, search);
    
    const initTime = performance.now() - startTime;
    const stats = database.getStats();
    
    logger.context?.info('Context database initialized', {
      userId,
      ...stats,
      initTimeMs: initTime.toFixed(2)
    });
    
    return { database, search };
  }
  
  /**
   * Get existing context database for user
   */
  getContext(userId: string): { database: ClientContextDatabase; search: VectorSearch } | null {
    const database = this.contextDatabases.get(userId);
    const search = this.vectorSearches.get(userId);
    
    if (!database || !search) return null;
    
    return { database, search };
  }
  
  /**
   * Add new document embedding to existing context
   */
  async addDocumentToContext(
    userId: string,
    document: Document,
    userKeys: CryptoKeyPair
  ): Promise<void> {
    const context = this.getContext(userId);
    if (!context || !this.hasEmbedding(document)) return;
    
    try {
      const embedding = await this.decryptDocumentEmbedding(document, userKeys);
      context.database.addEmbedding(embedding);
      
      logger.context?.debug('Added document to context', {
        userId,
        documentId: document.id
      });
    } catch (error) {
      logger.context?.error('Failed to add document to context', {
        userId,
        documentId: document.id,
        error: error.message
      });
    }
  }
  
  /**
   * Remove document from context
   */
  removeDocumentFromContext(userId: string, documentId: string): void {
    const context = this.getContext(userId);
    if (!context) return;
    
    context.database.removeEmbedding(documentId);
    
    logger.context?.debug('Removed document from context', {
      userId,
      documentId
    });
  }
  
  /**
   * Clear context for user
   */
  clearContext(userId: string): void {
    const context = this.getContext(userId);
    if (!context) return;
    
    context.database.clear();
    this.contextDatabases.delete(userId);
    this.vectorSearches.delete(userId);
    
    logger.context?.info('Cleared context database', { userId });
  }
  
  /**
   * Optimize memory usage across all contexts
   */
  optimizeMemory(): void {
    let totalRemoved = 0;
    
    this.contextDatabases.forEach((database, userId) => {
      const removed = database.optimizeMemory();
      totalRemoved += removed;
    });
    
    if (totalRemoved > 0) {
      logger.context?.info('Optimized context memory', {
        documentsRemoved: totalRemoved
      });
    }
  }
  
  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    const stats = {
      totalUsers: this.contextDatabases.size,
      totalMemoryMB: 0,
      totalDocuments: 0,
      userStats: new Map<string, any>()
    };
    
    this.contextDatabases.forEach((database, userId) => {
      const userStats = database.getStats();
      stats.totalMemoryMB += userStats.memoryUsageMB;
      stats.totalDocuments += userStats.documentCount;
      stats.userStats.set(userId, userStats);
    });
    
    return stats;
  }
  
  // Private helper methods
  
  private hasEmbedding(document: Document): boolean {
    return !!(document as any).embedding_vector;
  }
  
  private async decryptDocumentEmbedding(
    document: Document,
    userKeys: CryptoKeyPair
  ): Promise<DocumentEmbedding> {
    const doc = document as any;
    
    if (!doc.embedding_vector) {
      throw new Error('Document does not have embedding');
    }
    
    // Decrypt the embedding vector
    const encryptedVector = doc.embedding_vector;
    const decryptedData = await decryptAES(encryptedVector, userKeys.privateKey);
    const vectorArray = new Float32Array(decryptedData);
    
    // Create metadata
    const metadata: EmbeddingMetadata = {
      documentId: document.id,
      summary: doc.embedding_summary || 'No summary available',
      documentType: document.type,
      date: document.created_at || new Date().toISOString(),
      provider: doc.embedding_provider || 'unknown',
      model: doc.embedding_model || 'unknown',
      language: document.metadata?.language,
      tags: document.metadata?.tags || []
    };
    
    return {
      id: `emb_${document.id}`,
      documentId: document.id,
      vector: {
        vector: vectorArray,
        dimensions: vectorArray.length,
        normalized: true
      },
      metadata,
      timestamp: doc.embedding_timestamp || document.created_at || new Date().toISOString()
    };
  }
  
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
export const contextInitializer = new ContextInitializer();