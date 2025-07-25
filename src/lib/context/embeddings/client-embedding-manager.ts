/**
 * Client-Side Embedding Manager
 * 
 * Handles embedding storage, retrieval, and vector search operations 
 * on the client side. Does NOT generate embeddings (that's server-side only).
 */

import { logger } from '$lib/logging/logger';
import type { Document } from '$lib/documents/types.d';

export interface ClientEmbeddingData {
  documentId: string;
  vector: Float32Array;
  summary: string;
  metadata: {
    provider: string;
    model: string;
    dimensions: number;
    language: string;
    documentType: string;
    processingDate: string;
  };
}

export interface SearchResult {
  documentId: string;
  similarity: number;
  summary: string;
  metadata: any;
}

export interface EmbeddingStats {
  totalEmbeddings: number;
  dimensions: number;
  providers: string[];
  memoryUsageMB: number;
}

export class ClientEmbeddingManager {
  private embeddings = new Map<string, ClientEmbeddingData>();
  private clientLogger = logger.namespace('ClientEmbedding');
  private initialized = false;

  constructor() {
    this.clientLogger.debug('Client embedding manager created');
  }

  /**
   * Initialize the client embedding manager with existing embeddings
   */
  async initialize(embeddingData: ClientEmbeddingData[]): Promise<void> {
    this.clientLogger.info('Initializing client embedding manager', {
      embeddingCount: embeddingData.length
    });

    try {
      // Clear existing embeddings
      this.embeddings.clear();

      // Load embeddings into memory
      for (const embedding of embeddingData) {
        this.embeddings.set(embedding.documentId, embedding);
      }

      this.initialized = true;
      
      this.clientLogger.info('Client embedding manager initialized successfully', {
        totalEmbeddings: this.embeddings.size,
        memoryUsageMB: this.getMemoryUsage()
      });

    } catch (error) {
      this.clientLogger.error('Failed to initialize client embedding manager', { error });
      throw error;
    }
  }

  /**
   * Add a new embedding to the client cache
   */
  addEmbedding(embedding: ClientEmbeddingData): void {
    this.embeddings.set(embedding.documentId, embedding);
    
    this.clientLogger.debug('Added embedding to client cache', {
      documentId: embedding.documentId,
      dimensions: embedding.vector.length,
      totalEmbeddings: this.embeddings.size
    });
  }

  /**
   * Remove embedding from client cache
   */
  removeEmbedding(documentId: string): void {
    const removed = this.embeddings.delete(documentId);
    
    if (removed) {
      this.clientLogger.debug('Removed embedding from client cache', {
        documentId,
        remainingEmbeddings: this.embeddings.size
      });
    }
  }

  /**
   * Search for similar documents using cosine similarity
   */
  async searchSimilar(
    queryEmbedding: Float32Array,
    options: {
      limit?: number;
      threshold?: number;
      documentTypes?: string[];
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.initialized) {
      throw new Error('Client embedding manager not initialized');
    }

    const { limit = 10, threshold = 0.5, documentTypes } = options;
    const results: SearchResult[] = [];

    this.clientLogger.debug('Starting similarity search', {
      queryDimensions: queryEmbedding.length,
      totalEmbeddings: this.embeddings.size,
      limit,
      threshold
    });

    // Calculate similarities
    for (const [documentId, embedding] of this.embeddings) {
      // Filter by document type if specified
      if (documentTypes && !documentTypes.includes(embedding.metadata.documentType)) {
        continue;
      }

      // Check dimension compatibility
      if (embedding.vector.length !== queryEmbedding.length) {
        this.clientLogger.warn('Dimension mismatch in similarity search', {
          documentId,
          embeddingDimensions: embedding.vector.length,
          queryDimensions: queryEmbedding.length
        });
        continue;
      }

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, embedding.vector);

      // Only include results above threshold
      if (similarity >= threshold) {
        results.push({
          documentId,
          similarity,
          summary: embedding.summary,
          metadata: embedding.metadata
        });
      }
    }

    // Sort by similarity (highest first) and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = results.slice(0, limit);

    this.clientLogger.debug('Similarity search completed', {
      totalMatches: results.length,
      returnedResults: limitedResults.length,
      topSimilarity: limitedResults[0]?.similarity || 0
    });

    return limitedResults;
  }

  /**
   * Get embedding for a specific document
   */
  getEmbedding(documentId: string): ClientEmbeddingData | undefined {
    return this.embeddings.get(documentId);
  }

  /**
   * Check if document has embedding
   */
  hasEmbedding(documentId: string): boolean {
    return this.embeddings.has(documentId);
  }

  /**
   * Get embedding statistics
   */
  getStats(): EmbeddingStats {
    const embeddings = Array.from(this.embeddings.values());
    const providers = [...new Set(embeddings.map(e => e.metadata.provider))];
    const totalDimensions = embeddings.length > 0 ? embeddings[0].vector.length : 0;

    return {
      totalEmbeddings: embeddings.length,
      dimensions: totalDimensions,
      providers,
      memoryUsageMB: this.getMemoryUsage()
    };
  }

  /**
   * Get all embeddings for export/backup
   */
  getAllEmbeddings(): ClientEmbeddingData[] {
    return Array.from(this.embeddings.values());
  }

  /**
   * Clear all embeddings from memory
   */
  clear(): void {
    this.embeddings.clear();
    this.initialized = false;
    this.clientLogger.info('Cleared all embeddings from client cache');
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match for similarity calculation');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Estimate memory usage in MB
   */
  private getMemoryUsage(): number {
    const embeddings = Array.from(this.embeddings.values());
    let totalBytes = 0;

    for (const embedding of embeddings) {
      // Float32Array: 4 bytes per float
      totalBytes += embedding.vector.length * 4;
      // Summary and metadata strings (rough estimate)
      totalBytes += embedding.summary.length * 2; // UTF-16 encoding
      totalBytes += JSON.stringify(embedding.metadata).length * 2;
      totalBytes += embedding.documentId.length * 2;
    }

    return totalBytes / (1024 * 1024); // Convert to MB
  }

  /**
   * Check if client embedding manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance for client-side use
export const clientEmbeddingManager = new ClientEmbeddingManager();