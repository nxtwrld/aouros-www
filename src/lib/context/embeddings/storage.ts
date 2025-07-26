/**
 * Embedding Storage
 * 
 * Manages storing and retrieving embedding vectors in document metadata.
 * No additional encryption needed - embeddings are encrypted with metadata.
 */

import { updateDocument, getDocument } from '$lib/documents';
import type { Document } from '$lib/documents/types.d';
import { logger } from '$lib/logging/logger';

export class EmbeddingStorage {
  
  /**
   * Store embedding for a document in metadata
   */
  async storeEmbedding(
    documentId: string,
    embedding: Float32Array,
    summary: string,
    provider: string,
    model: string
  ): Promise<void> {
    try {
      // Get the document
      const document = await getDocument(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }
      
      // Store embedding vector as JSON string (will be encrypted with metadata)
      const vectorArray = Array.from(embedding);
      
      // Update document metadata with embedding fields
      const embeddings = {
        summary,
        vector: JSON.stringify(vectorArray),
        provider,
        model,
        timestamp: new Date().toISOString()
      };
      
      const updatedDocument = {
        ...document,
        metadata: {
          ...document.metadata,
          embeddings
        }
      };
      
      // Save the updated document
      await updateDocument(updatedDocument);
      
      logger.namespace('EmbeddingStorage').info('Stored embedding for document', {
        documentId,
        provider,
        model,
        dimensions: embedding.length
      });
      
    } catch (error) {
      logger.namespace('EmbeddingStorage').error('Failed to store embedding', {
        documentId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Retrieve embedding for a document from metadata
   */
  async retrieveEmbedding(
    documentId: string
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
      
      // Check if document has embedding in metadata
      const embeddings = document.metadata?.embeddings;
      if (!embeddings?.vector) {
        return null;
      }
      
      // Parse the embedding vector (already decrypted with metadata)
      const vectorArray = JSON.parse(embeddings.vector);
      const embedding = new Float32Array(vectorArray);
      
      return {
        embedding,
        summary: embeddings.summary || '',
        provider: embeddings.provider || 'unknown',
        model: embeddings.model || 'unknown',
        timestamp: embeddings.timestamp || ''
      };
      
    } catch (error) {
      logger.namespace('EmbeddingStorage').error('Failed to retrieve embedding', {
        documentId,
        error: error instanceof Error ? error.message : String(error)
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
      
      return !!(document.metadata?.embeddings?.vector);
      
    } catch (error) {
      logger.namespace('EmbeddingStorage').error('Failed to check embedding existence', {
        documentId,
        error: error instanceof Error ? error.message : String(error)
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
      
      // Remove embeddings from metadata
      const { embeddings, ...metadataWithoutEmbeddings } = document.metadata || {};
      const updatedDocument = {
        ...document,
        metadata: metadataWithoutEmbeddings
      };
      
      // Save the updated document
      await updateDocument(updatedDocument);
      
      logger.namespace('EmbeddingStorage').info('Removed embedding from document', { documentId });
      
    } catch (error) {
      logger.namespace('EmbeddingStorage').error('Failed to remove embedding', {
        documentId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  /**
   * Batch retrieve embeddings for multiple documents
   */
  async retrieveBatchEmbeddings(
    documentIds: string[]
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
          const embedding = await this.retrieveEmbedding(docId);
          if (embedding) {
            results.set(docId, embedding);
          }
        } catch (error) {
          logger.namespace('EmbeddingStorage').error('Failed to retrieve embedding in batch', {
            documentId: docId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    logger.namespace('EmbeddingStorage').debug('Retrieved batch embeddings', {
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
      const embeddings = doc.metadata?.embeddings;
      
      if (embeddings?.vector) {
        stats.documentsWithEmbeddings++;
        
        // Track providers
        const provider = embeddings.provider || 'unknown';
        stats.providers.set(provider, (stats.providers.get(provider) || 0) + 1);
        
        // Track models
        const model = embeddings.model || 'unknown';
        stats.models.set(model, (stats.models.get(model) || 0) + 1);
        
        // Track timestamps
        if (embeddings.timestamp) {
          const embeddingDate = new Date(embeddings.timestamp);
          if (embeddingDate < oldestDate) {
            oldestDate = embeddingDate;
            stats.oldestEmbedding = embeddings.timestamp;
          }
          if (embeddingDate > newestDate) {
            newestDate = embeddingDate;
            stats.newestEmbedding = embeddings.timestamp;
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
      
      const embeddings = document.metadata?.embeddings;
      if (!embeddings?.vector) {
        throw new Error(`Document ${documentId} does not have embedding`);
      }
      
      // Update just the summary in embeddings metadata
      const updatedEmbeddings = {
        ...embeddings,
        summary: newSummary
      };
      
      const updatedDocument = {
        ...document,
        metadata: {
          ...document.metadata,
          embeddings: updatedEmbeddings
        }
      };
      
      await updateDocument(updatedDocument);
      
      logger.namespace('EmbeddingStorage').info('Updated embedding summary', { documentId });
      
    } catch (error) {
      logger.namespace('EmbeddingStorage').error('Failed to update embedding summary', {
        documentId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export singleton instance
export const embeddingStorage = new EmbeddingStorage();