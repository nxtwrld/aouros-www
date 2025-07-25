/**
 * Server-Side Embedding Service
 * 
 * This service runs only on the server side and can safely access API keys.
 * Used by LangGraph workflows and server-side operations.
 */

import { ServerOnlyOpenAIProvider } from './providers/openai-server';
import { logger } from '$lib/logging/logger';

export interface ServerEmbeddingResult {
  success: boolean;
  embedding?: Float32Array;
  provider?: string;
  model?: string;
  dimensions?: number;
  error?: string;
  usage?: {
    tokens: number;
    cost: number;
  };
}

export interface DocumentEmbeddingInput {
  id: string;
  type: string;
  content: string;
  summary: string;
  metadata?: {
    language?: string;
    processingDate?: string;
    [key: string]: any;
  };
}

export class ServerEmbeddingService {
  private openAIProvider: ServerOnlyOpenAIProvider;
  private embeddingLogger = logger.namespace('ServerEmbedding');

  constructor() {
    // Initialize server-only OpenAI provider
    this.openAIProvider = new ServerOnlyOpenAIProvider({
      model: 'text-embedding-3-small',
      dimensions: 1536
    });
  }

  /**
   * Check if embedding service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.openAIProvider.isAvailable();
    } catch (error) {
      this.embeddingLogger.error('Error checking embedding service availability', { error });
      return false;
    }
  }

  /**
   * Generate embedding for a document during LangGraph processing
   */
  async generateDocumentEmbedding(input: DocumentEmbeddingInput): Promise<ServerEmbeddingResult> {
    try {
      this.embeddingLogger.info('Generating document embedding', {
        documentId: input.id,
        documentType: input.type,
        summaryLength: input.summary.length,
        contentLength: input.content.length
      });

      // Check if service is available
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Embedding service not available'
        };
      }

      // Validate input
      if (!input.summary || input.summary.length < 10) {
        return {
          success: false,
          error: 'Document summary too short for embedding'
        };
      }

      // Generate the embedding
      const embeddingResult = await this.openAIProvider.generateEmbedding(input.summary);
      
      if (!embeddingResult.success) {
        return {
          success: false,
          error: embeddingResult.error
        };
      }

      // Calculate usage metrics
      const actualTokens = embeddingResult.usage?.prompt_tokens || Math.ceil(input.summary.length / 4);
      const estimatedCost = (actualTokens / 1000) * 0.00002; // OpenAI text-embedding-3-small pricing

      this.embeddingLogger.info('Successfully generated document embedding', {
        documentId: input.id,
        dimensions: embeddingResult.embedding!.length,
        actualTokens,
        estimatedCost
      });

      return {
        success: true,
        embedding: embeddingResult.embedding!,
        provider: 'openai',
        model: 'text-embedding-3-small',
        dimensions: embeddingResult.embedding!.length,
        usage: {
          tokens: actualTokens,
          cost: estimatedCost
        }
      };

    } catch (error) {
      this.embeddingLogger.error('Failed to generate document embedding', {
        documentId: input.id,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown embedding generation error'
      };
    }
  }

  /**
   * Generate embedding for a query string
   */
  async generateQueryEmbedding(query: string): Promise<ServerEmbeddingResult> {
    try {
      this.embeddingLogger.debug('Generating query embedding', {
        queryLength: query.length
      });

      // Check if service is available
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Embedding service not available'
        };
      }

      // Validate query
      if (!query || query.trim().length < 3) {
        return {
          success: false,
          error: 'Query too short for embedding'
        };
      }

      // Generate the embedding
      const embeddingResult = await this.openAIProvider.generateEmbedding(query.trim());
      
      if (!embeddingResult.success) {
        return {
          success: false,
          error: embeddingResult.error
        };
      }

      // Calculate usage metrics
      const actualTokens = embeddingResult.usage?.prompt_tokens || Math.ceil(query.length / 4);
      const estimatedCost = (actualTokens / 1000) * 0.00002;

      this.embeddingLogger.debug('Successfully generated query embedding', {
        dimensions: embeddingResult.embedding!.length,
        actualTokens,
        estimatedCost
      });

      return {
        success: true,
        embedding: embeddingResult.embedding!,
        provider: 'openai',
        model: 'text-embedding-3-small',
        dimensions: embeddingResult.embedding!.length,
        usage: {
          tokens: actualTokens,
          cost: estimatedCost
        }
      };

    } catch (error) {
      this.embeddingLogger.error('Failed to generate query embedding', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown embedding generation error'
      };
    }
  }

  /**
   * Generate embeddings for multiple documents in batch
   */
  async generateBatchEmbeddings(inputs: DocumentEmbeddingInput[]): Promise<{
    results: Map<string, ServerEmbeddingResult>;
    successful: number;
    failed: number;
  }> {
    this.embeddingLogger.info('Starting batch embedding generation', {
      count: inputs.length
    });

    const results = new Map<string, ServerEmbeddingResult>();
    let successful = 0;
    let failed = 0;

    // Check if service is available
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      const errorResult: ServerEmbeddingResult = {
        success: false,
        error: 'Embedding service not available'
      };
      
      inputs.forEach(input => {
        results.set(input.id, errorResult);
        failed++;
      });

      return { results, successful, failed };
    }

    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < inputs.length; i += batchSize) {
      const batch = inputs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (input) => {
        const result = await this.generateDocumentEmbedding(input);
        results.set(input.id, result);
        return result;
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Update counters
      batchResults.forEach(result => {
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      });

      this.embeddingLogger.debug('Completed embedding batch', {
        batchStart: i,
        batchSize: batch.length,
        successful,
        failed
      });
    }

    this.embeddingLogger.info('Batch embedding generation completed', {
      total: inputs.length,
      successful,
      failed
    });

    return { results, successful, failed };
  }

  /**
   * Get provider information
   */
  getProviderInfo() {
    return {
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536,
      maxTokens: 8191,
      costPer1kTokens: 0.00002
    };
  }
}

// Export singleton instance for server-side use
export const serverEmbeddingService = new ServerEmbeddingService();