/**
 * Embedding Manager
 * 
 * Orchestrates the entire embedding workflow including generation,
 * storage, retrieval, and integration with the document system.
 */

import { embeddingProviderManager } from './providers/abstraction';
import { createOpenAIProviders } from './providers/openai';
import { embeddingStorage } from './storage';
import type { Document } from '$lib/documents/types.d';
import type { EmbeddingGenerationOptions } from '../types';
import { logger } from '$lib/logging/logger';

export class EmbeddingManager {
  private initialized = false;
  
  constructor() {
    this.initializeProviders();
  }
  
  /**
   * Initialize embedding providers
   */
  private initializeProviders(): void {
    try {
      // Register OpenAI providers
      const openAIProviders = createOpenAIProviders();
      openAIProviders.forEach(({ name, provider }) => {
        embeddingProviderManager.registerProvider(name, provider);
      });
      
      // Set primary and fallback providers
      embeddingProviderManager.setPrimaryProvider('openai');
      embeddingProviderManager.setFallbackProviders(['openai-fallback']);
      
      this.initialized = true;
      logger.context?.info('Embedding manager initialized');
    } catch (error) {
      logger.context?.error('Failed to initialize embedding manager', { error });
    }
  }
  
  /**
   * Generate and store embedding for a document
   */
  async generateEmbeddingForDocument(
    document: Document,
    userKey: CryptoKey,
    options: EmbeddingGenerationOptions = {}
  ): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Embedding manager not initialized');
    }
    
    try {
      // Check if document already has embedding
      const hasEmbedding = await embeddingStorage.hasEmbedding(document.id);
      if (hasEmbedding && !options.forceRegenerate) {
        logger.context?.debug('Document already has embedding', { documentId: document.id });
        return true;
      }
      
      // Generate summary for embedding
      const summary = this.generateDocumentSummary(document);
      if (!summary || summary.length < 10) {
        logger.context?.warn('Document summary too short for embedding', { 
          documentId: document.id,
          summaryLength: summary?.length || 0
        });
        return false;
      }
      
      // Generate embedding
      const { embedding, provider } = await embeddingProviderManager.generateEmbedding(
        summary,
        options
      );
      
      // Get provider model info
      const providerInstance = embeddingProviderManager.getProvider(provider);
      const modelInfo = providerInstance?.getInfo();
      
      // Store encrypted embedding
      await embeddingStorage.storeEmbedding(
        document.id,
        embedding,
        summary,
        provider,
        modelInfo?.model || 'unknown',
        userKey
      );
      
      logger.context?.info('Generated and stored embedding', {
        documentId: document.id,
        provider,
        model: modelInfo?.model,
        dimensions: embedding.length,
        summaryLength: summary.length
      });
      
      return true;
    } catch (error) {
      logger.context?.error('Failed to generate embedding for document', {
        documentId: document.id,
        error: error.message
      });
      return false;
    }
  }
  
  /**
   * Generate embeddings for multiple documents in batch
   */
  async generateEmbeddingsForDocuments(
    documents: Document[],
    userKey: CryptoKey,
    options: EmbeddingGenerationOptions & {
      batchSize?: number;
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<{ successful: number; failed: number; results: Map<string, boolean> }> {
    const results = new Map<string, boolean>();
    const batchSize = options.batchSize || 5;
    let successful = 0;
    let failed = 0;
    
    // Filter documents that need embeddings
    const documentsNeedingEmbeddings = [];
    for (const doc of documents) {
      const hasEmbedding = await embeddingStorage.hasEmbedding(doc.id);
      if (!hasEmbedding || options.forceRegenerate) {
        documentsNeedingEmbeddings.push(doc);
      } else {
        results.set(doc.id, true);
        successful++;
      }
    }
    
    logger.context?.info('Starting batch embedding generation', {
      totalDocuments: documents.length,
      needingEmbeddings: documentsNeedingEmbeddings.length,
      batchSize
    });
    
    // Process in batches
    for (let i = 0; i < documentsNeedingEmbeddings.length; i += batchSize) {
      const batch = documentsNeedingEmbeddings.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (doc) => {
        const success = await this.generateEmbeddingForDocument(doc, userKey, options);
        results.set(doc.id, success);
        return success;
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      // Update counters
      batchResults.forEach(success => {
        if (success) successful++;
        else failed++;
      });
      
      // Report progress
      const completed = i + batch.length;
      options.onProgress?.(completed, documentsNeedingEmbeddings.length);
      
      logger.context?.debug('Completed embedding batch', {
        batchStart: i,
        batchSize: batch.length,
        completed,
        total: documentsNeedingEmbeddings.length
      });
    }
    
    logger.context?.info('Batch embedding generation completed', {
      totalDocuments: documents.length,
      successful,
      failed
    });
    
    return { successful, failed, results };
  }
  
  /**
   * Generate query embedding for search
   */
  async generateQueryEmbedding(
    query: string,
    options: EmbeddingGenerationOptions = {}
  ): Promise<Float32Array> {
    if (!this.initialized) {
      throw new Error('Embedding manager not initialized');
    }
    
    try {
      const { embedding } = await embeddingProviderManager.generateEmbedding(
        query,
        options
      );
      
      logger.context?.debug('Generated query embedding', {
        queryLength: query.length,
        dimensions: embedding.length
      });
      
      return embedding;
    } catch (error) {
      logger.context?.error('Failed to generate query embedding', {
        query: query.substring(0, 100) + '...',
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Update document summary without regenerating embedding
   */
  async updateDocumentSummary(
    document: Document,
    customSummary?: string
  ): Promise<void> {
    const summary = customSummary || this.generateDocumentSummary(document);
    
    await embeddingStorage.updateEmbeddingSummary(document.id, summary);
    
    logger.context?.info('Updated document summary', {
      documentId: document.id,
      summaryLength: summary.length
    });
  }
  
  /**
   * Remove embedding for a document
   */
  async removeEmbedding(documentId: string): Promise<void> {
    await embeddingStorage.removeEmbedding(documentId);
    logger.context?.info('Removed embedding', { documentId });
  }
  
  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(documents: Document[]) {
    return await embeddingStorage.getEmbeddingStats(documents);
  }
  
  /**
   * Check if document is suitable for embedding
   */
  isDocumentSuitableForEmbedding(document: Document): boolean {
    // Check document type
    if (document.type === 'profile' || document.type === 'health') {
      return false; // These are structured data, not text content
    }
    
    // Check if document has meaningful content
    const summary = this.generateDocumentSummary(document);
    return summary && summary.length >= 50; // Minimum content length
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
    if (content.text) {
      parts.push(content.text);
    } else if (content.content) {
      parts.push(content.content);
    } else if (content.body) {
      parts.push(content.body);
    } else if (content.description) {
      parts.push(content.description);
    }
    
    // Add extracted medical data if available
    if (content.signals) {
      const medicalSummary = this.extractMedicalSummary(content.signals);
      if (medicalSummary) {
        parts.push(`Medical findings: ${medicalSummary}`);
      }
    }
    
    // Combine and clean up
    let summary = parts.join('\n\n').trim();
    
    // Remove excessive whitespace
    summary = summary.replace(/\s+/g, ' ');
    
    // Truncate if too long (embedding models have token limits)
    const maxLength = 8000; // Conservative limit for most models
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength) + '...';
    }
    
    return summary;
  }
  
  /**
   * Extract medical summary from signals
   */
  private extractMedicalSummary(signals: any): string {
    if (!signals || typeof signals !== 'object') {
      return '';
    }
    
    const summaryParts: string[] = [];
    
    // Extract key medical information
    Object.entries(signals).forEach(([key, value]: [string, any]) => {
      if (value && typeof value === 'object' && value.values) {
        const latestValue = value.values[0];
        if (latestValue && latestValue.value) {
          summaryParts.push(`${key}: ${latestValue.value}`);
        }
      }
    });
    
    return summaryParts.slice(0, 10).join(', '); // Limit to top 10 signals
  }
  
  /**
   * Get provider information
   */
  getProviderInfo() {
    return embeddingProviderManager.getAllProviders();
  }
}

// Export singleton instance
export const embeddingManager = new EmbeddingManager();