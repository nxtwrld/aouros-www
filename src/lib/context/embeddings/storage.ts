/**
 * Encrypted Embedding Storage
 * 
 * Manages storing and retrieving encrypted embedding vectors
 * using the existing document encryption system.
 */

import { encrypt as encryptAES, decrypt as decryptAES } from '$lib/encryption/aes';
import { updateDocument, getDocument } from '$lib/documents';
import type { Document } from '$lib/documents/types.d';
import type { EmbeddingGenerationOptions } from '../types';
import { logger } from '$lib/logging/logger';

export class EmbeddingStorage {
  
  /**
   * Store encrypted embedding for a document
   */
  async storeEmbedding(
    documentId: string,
    embedding: Float32Array,
    summary: string,
    provider: string,
    model: string,
    userKey: CryptoKey
  ): Promise<void> {
    try {
      // Get the document
      const document = await getDocument(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }
      
      // Encrypt the embedding vector
      const vectorBuffer = embedding.buffer;
      const encryptedVector = await encryptAES(vectorBuffer, userKey);
      
      // Update document with embedding fields
      const updatedDocument = {
        ...document,
        embedding_summary: summary,
        embedding_vector: encryptedVector,
        embedding_provider: provider,
        embedding_model: model,
        embedding_timestamp: new Date().toISOString()
      };
      
      // Save the updated document
      await updateDocument(updatedDocument);
      
      logger.context?.info('Stored embedding for document', {
        documentId,
        provider,
        model,
        dimensions: embedding.length
      });
      
    } catch (error) {
      logger.context?.error('Failed to store embedding', {
        documentId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Retrieve and decrypt embedding for a document
   */
  async retrieveEmbedding(
    documentId: string,
    userKey: CryptoKey
  ): Promise<{
    embedding: Float32Array;
    summary: string;
    provider: string;
    model: string;
    timestamp: string;
  } | null> {
    try {
      const document = await getDocument(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }
      
      // Check if document has embedding
      const docWithEmbedding = document as any;
      if (!docWithEmbedding.embedding_vector) {
        return null;
      }
      
      // Decrypt the embedding vector
      const decryptedBuffer = await decryptAES(
        docWithEmbedding.embedding_vector,
        userKey
      );
      const embedding = new Float32Array(decryptedBuffer);
      
      return {
        embedding,
        summary: docWithEmbedding.embedding_summary || '',
        provider: docWithEmbedding.embedding_provider || 'unknown',
        model: docWithEmbedding.embedding_model || 'unknown',
        timestamp: docWithEmbedding.embedding_timestamp || ''
      };
      
    } catch (error) {
      logger.context?.error('Failed to retrieve embedding', {
        documentId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Check if document has embedding
   */
  async hasEmbedding(documentId: string): Promise<boolean> {
    try {
      const document = await getDocument(documentId);
      if (!document) return false;
      
      const docWithEmbedding = document as any;
      return !!docWithEmbedding.embedding_vector;
      
    } catch (error) {
      logger.context?.error('Failed to check embedding existence', {
        documentId,
        error: error.message
      });
      return false;
    }
  }
  
  /**
   * Remove embedding from document
   */
  async removeEmbedding(documentId: string): Promise<void> {
    try {
      const document = await getDocument(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }
      
      // Remove embedding fields
      const updatedDocument = {
        ...document,
        embedding_summary: undefined,
        embedding_vector: undefined,
        embedding_provider: undefined,
        embedding_model: undefined,
        embedding_timestamp: undefined
      };
      
      // Save the updated document
      await updateDocument(updatedDocument);
      
      logger.context?.info('Removed embedding from document', { documentId });
      
    } catch (error) {
      logger.context?.error('Failed to remove embedding', {
        documentId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Batch retrieve embeddings for multiple documents
   */
  async retrieveBatchEmbeddings(
    documentIds: string[],
    userKey: CryptoKey
  ): Promise<Map<string, {
    embedding: Float32Array;
    summary: string;
    provider: string;
    model: string;
    timestamp: string;
  }>> {
    const results = new Map();
    
    // Process in parallel but limit concurrency
    const batchSize = 5;
    for (let i = 0; i < documentIds.length; i += batchSize) {
      const batch = documentIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (docId) => {
        try {
          const embedding = await this.retrieveEmbedding(docId, userKey);
          if (embedding) {
            results.set(docId, embedding);
          }
        } catch (error) {
          logger.context?.error('Failed to retrieve embedding in batch', {
            documentId: docId,
            error: error.message
          });
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    logger.context?.debug('Retrieved batch embeddings', {
      requested: documentIds.length,
      retrieved: results.size
    });
    
    return results;
  }
  
  /**
   * Get embedding statistics for a user
   */
  async getEmbeddingStats(userDocuments: Document[]): Promise<{
    totalDocuments: number;
    documentsWithEmbeddings: number;
    providers: Map<string, number>;
    models: Map<string, number>;
    oldestEmbedding?: string;
    newestEmbedding?: string;
  }> {
    const stats = {
      totalDocuments: userDocuments.length,
      documentsWithEmbeddings: 0,
      providers: new Map<string, number>(),
      models: new Map<string, number>(),
      oldestEmbedding: undefined as string | undefined,
      newestEmbedding: undefined as string | undefined
    };
    
    let oldestDate = new Date();
    let newestDate = new Date(0);
    
    for (const doc of userDocuments) {
      const docWithEmbedding = doc as any;
      
      if (docWithEmbedding.embedding_vector) {
        stats.documentsWithEmbeddings++;
        
        // Track providers
        const provider = docWithEmbedding.embedding_provider || 'unknown';
        stats.providers.set(provider, (stats.providers.get(provider) || 0) + 1);
        
        // Track models
        const model = docWithEmbedding.embedding_model || 'unknown';
        stats.models.set(model, (stats.models.get(model) || 0) + 1);
        
        // Track timestamps
        if (docWithEmbedding.embedding_timestamp) {
          const embeddingDate = new Date(docWithEmbedding.embedding_timestamp);
          if (embeddingDate < oldestDate) {
            oldestDate = embeddingDate;
            stats.oldestEmbedding = docWithEmbedding.embedding_timestamp;
          }
          if (embeddingDate > newestDate) {
            newestDate = embeddingDate;
            stats.newestEmbedding = docWithEmbedding.embedding_timestamp;
          }
        }
      }
    }
    
    return stats;
  }
  
  /**
   * Update embedding summary (useful for re-summarization)
   */
  async updateEmbeddingSummary(
    documentId: string,
    newSummary: string
  ): Promise<void> {
    try {
      const document = await getDocument(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }
      
      const docWithEmbedding = document as any;
      if (!docWithEmbedding.embedding_vector) {
        throw new Error(`Document ${documentId} does not have embedding`);
      }
      
      // Update just the summary
      const updatedDocument = {
        ...document,
        embedding_summary: newSummary
      };
      
      await updateDocument(updatedDocument);
      
      logger.context?.info('Updated embedding summary', { documentId });
      
    } catch (error) {
      logger.context?.error('Failed to update embedding summary', {
        documentId,
        error: error.message
      });
      throw error;
    }
  }
}

// Export singleton instance
export const embeddingStorage = new EmbeddingStorage();