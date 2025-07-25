/**
 * Server-side Query Embedding Generation API
 * 
 * Generates embeddings for search queries on the server side.
 * Used by client-side context assembly for semantic search.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverEmbeddingService } from '$lib/context/embeddings/server-embedding-service';
import { logger } from '$lib/logging/logger';

const queryEmbeddingLogger = logger.namespace('QueryEmbeddingAPI');

export const POST: RequestHandler = async ({ request, locals: { safeGetSession } }) => {
  try {
    // Verify authentication
    const { session } = await safeGetSession();
    if (!session) {
      queryEmbeddingLogger.warn('Unauthorized query embedding generation attempt');
      error(401, { message: 'Unauthorized' });
    }

    const data = await request.json();
    const { query } = data;

    // Validate input
    if (!query || typeof query !== 'string') {
      error(400, { message: 'Query text is required and must be a string' });
    }

    if (query.trim().length === 0) {
      error(400, { message: 'Query cannot be empty' });
    }

    if (query.length > 1000) {
      error(400, { message: 'Query must be less than 1000 characters' });
    }

    queryEmbeddingLogger.debug('Generating query embedding', {
      userId: session.user.id,
      queryLength: query.length
    });

    // Check if embedding service is available
    const isAvailable = await serverEmbeddingService.isAvailable();
    if (!isAvailable) {
      queryEmbeddingLogger.error('Embedding service not available');
      error(503, { message: 'Embedding service temporarily unavailable' });
    }

    // Generate embedding for the query
    const embeddingResult = await serverEmbeddingService.generateQueryEmbedding(query.trim());

    if (!embeddingResult.success) {
      queryEmbeddingLogger.error('Query embedding generation failed', {
        userId: session.user.id,
        error: embeddingResult.error
      });
      error(500, { message: 'Failed to generate embedding for query' });
    }

    queryEmbeddingLogger.debug('Successfully generated query embedding', {
      userId: session.user.id,
      dimensions: embeddingResult.embedding!.length,
      usage: embeddingResult.usage
    });

    return json({
      success: true,
      data: {
        embedding: Array.from(embeddingResult.embedding!),
        provider: embeddingResult.provider,
        model: embeddingResult.model,
        dimensions: embeddingResult.dimensions
      },
      usage: embeddingResult.usage
    });

  } catch (err) {
    queryEmbeddingLogger.error('Query embedding generation failed', {
      error: err instanceof Error ? err.message : String(err)
    });

    if (err instanceof Error && err.message.includes('API')) {
      error(503, { message: 'External embedding service error' });
    }

    error(500, { message: 'Internal server error' });
  }
};