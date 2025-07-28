/**
 * Server-Side Chat Context Service
 * 
 * Handles chat context integration on the server side using
 * direct access to the server embedding service.
 */

import { BaseChatContextService } from '../shared/chat-context-base';
import { serverEmbeddingService } from '../../embeddings/server-embedding-service';
import { logger } from '$lib/logging/logger';

export class ServerChatContextService extends BaseChatContextService {
  
  /**
   * Generate embedding for search query using server-side embedding service
   */
  protected async generateQueryEmbedding(query: string): Promise<Float32Array> {
    try {
      const embeddingResult = await serverEmbeddingService.generateQueryEmbedding(query);
      
      if (!embeddingResult.success || !embeddingResult.embedding) {
        throw new Error(embeddingResult.error || 'Failed to generate embedding');
      }

      return embeddingResult.embedding;

    } catch (error) {
      logger.namespace('ServerChatContext').error('Failed to generate query embedding', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export singleton instance for server-side use
export const serverChatContextService = new ServerChatContextService();