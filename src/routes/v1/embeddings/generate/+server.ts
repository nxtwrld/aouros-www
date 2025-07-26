/**
 * Document Embedding Generation API
 * 
 * Generates embeddings for individual documents on-demand.
 * Used by client-side document loading to ensure documents have embeddings.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serverEmbeddingService } from '$lib/context/embeddings/server-embedding-service';
import { logger } from '$lib/logging/logger';

const documentEmbeddingLogger = logger.namespace('DocumentEmbeddingAPI');

export const POST: RequestHandler = async ({ request, locals: { safeGetSession } }) => {
  try {
    // Verify authentication
    const { session } = await safeGetSession();
    if (!session) {
      documentEmbeddingLogger.warn('Unauthorized document embedding generation attempt');
      error(401, { message: 'Unauthorized' });
    }

    const data = await request.json();
    const { documentId, content, type, metadata } = data;

    // Validate input
    if (!documentId || typeof documentId !== 'string') {
      error(400, { message: 'Document ID is required and must be a string' });
    }

    if (!content || typeof content !== 'string') {
      error(400, { message: 'Document content is required and must be a string' });
    }

    if (content.trim().length === 0) {
      error(400, { message: 'Document content cannot be empty' });
    }

    // Trim content if too long instead of throwing error
    let trimmedContent = content;
    if (content.length > 48000) {
      trimmedContent = content.substring(0, 48000) + '...';
      documentEmbeddingLogger.warn('Content trimmed for embedding generation', {
        originalLength: content.length,
        trimmedLength: trimmedContent.length
      });
    }



    documentEmbeddingLogger.info('Generating document embedding', {
      userId: session.user.id,
      documentId,
      contentLength: content.length,
      documentType: type,
      language: metadata?.language || 'en',
      contentPreview: content.substring(0, 300) + (content.length > 300 ? '...' : '')
    });



    // Check if embedding service is available
    const isAvailable = await serverEmbeddingService.isAvailable();
    if (!isAvailable) {
      documentEmbeddingLogger.error('Embedding service not available');
      error(503, { message: 'Embedding service temporarily unavailable' });
    }

    // Prepare document embedding input
    const embeddingInput = {
      id: documentId,
      type: type || 'document',
      content: trimmedContent.trim(),
      metadata: {
        language: metadata?.language || 'en',
        processingDate: new Date().toISOString()
      }
    };
    // Generate embedding for the document
    const embeddingResult = await serverEmbeddingService.generateDocumentEmbedding(embeddingInput);

    if (!embeddingResult.success) {
      documentEmbeddingLogger.error('Document embedding generation failed', {
        userId: session.user.id,
        documentId,
        error: embeddingResult.error
      });
      error(500, { message: 'Failed to generate embedding for document' });
    }

    // Format embedding data for metadata storage
    const embeddingData = {
      vector: JSON.stringify(Array.from(embeddingResult.embedding!)),
      provider: embeddingResult.provider || 'openai',
      model: embeddingResult.model || 'text-embedding-3-small',
      timestamp: new Date().toISOString()
    };

    documentEmbeddingLogger.info('Successfully generated document embedding', {
      userId: session.user.id,
      documentId,
      dimensions: embeddingResult.dimensions,
      provider: embeddingResult.provider,
      usage: embeddingResult.usage
    });

    return json({
      success: true,
      data: embeddingData,
      usage: embeddingResult.usage
    });

  } catch (err) {
    documentEmbeddingLogger.error('Document embedding generation failed', {
      error: err instanceof Error ? err.message : String(err)
    });

    if (err instanceof Error && err.message.includes('API')) {
      error(503, { message: 'External embedding service error' });
    }

    error(500, { message: 'Internal server error' });
  }
};