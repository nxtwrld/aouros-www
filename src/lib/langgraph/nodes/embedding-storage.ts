/**
 * LangGraph Node: Embedding Storage
 * 
 * Stores generated embeddings encrypted alongside document metadata.
 * This node handles the encryption and storage of embedding vectors.
 */

import type { DocumentProcessingState } from "../state";
import { logger } from '$lib/logging/logger';

/**
 * Store encrypted embedding with document
 */
export async function embeddingStorageNode(
  state: DocumentProcessingState
): Promise<Partial<DocumentProcessingState>> {
  try {
    logger.namespace('EmbeddingStorage').info('Starting embedding storage', {
      hasEmbeddingGeneration: !!state.embeddingGeneration,
      embeddingSuccess: state.embeddingGeneration?.success
    });

    // Emit progress
    state.emitProgress?.('embedding_storage', 0, 'Preparing embedding for storage');

    // Check if we have embedding data to store
    if (!state.embeddingGeneration?.success || !state.embeddingGeneration?.embeddingData) {
      logger.namespace('EmbeddingStorage').info('No embedding data to store', {
        hasEmbeddingGeneration: !!state.embeddingGeneration,
        embeddingSuccess: state.embeddingGeneration?.success,
        skipped: state.embeddingGeneration?.skipped
      });
      
      return {
        embeddingStorage: {
          skipped: true,
          reason: state.embeddingGeneration?.skipped ? 'Embedding generation was skipped' : 'No embedding data available',
          timestamp: new Date().toISOString()
        }
      };
    }

    const embeddingData = state.embeddingGeneration.embeddingData;

    state.emitProgress?.('embedding_storage', 25, 'Validating embedding data');

    // Validate embedding data
    if (!embeddingData.vector || !Array.isArray(embeddingData.vector) || embeddingData.vector.length === 0) {
      logger.namespace('EmbeddingStorage').error('Invalid embedding vector data', {
        hasVector: !!embeddingData.vector,
        vectorType: typeof embeddingData.vector,
        vectorLength: Array.isArray(embeddingData.vector) ? embeddingData.vector.length : 'N/A'
      });
      
      return {
        embeddingStorage: {
          success: false,
          error: 'Invalid embedding vector data',
          timestamp: new Date().toISOString()
        }
      };
    }

    state.emitProgress?.('embedding_storage', 50, 'Preparing embedding metadata');

    // Prepare embedding metadata for storage
    const embeddingMetadata = {
      // Core embedding fields for document storage
      embedding_provider: embeddingData.metadata.provider,
      embedding_model: embeddingData.metadata.model,
      embedding_dimensions: embeddingData.metadata.dimensions,
      embedding_timestamp: new Date().toISOString(),
      
      // Additional metadata
      embedding_language: embeddingData.metadata.language,
      embedding_document_type: embeddingData.metadata.documentType,
      embedding_processing_date: embeddingData.metadata.processingDate,
      
      // Note: The actual embedding_vector will be encrypted and stored separately
      // by the document save process using the embeddingManager
    };

    state.emitProgress?.('embedding_storage', 75, 'Finalizing embedding storage preparation');

    // The actual encryption and storage will be handled by the document save process
    // We just prepare the metadata and embedding data for inclusion in the final document
    logger.namespace('EmbeddingStorage').info('Embedding storage preparation completed', {
      provider: embeddingData.metadata.provider,
      model: embeddingData.metadata.model,
      dimensions: embeddingData.metadata.dimensions,
      vectorLength: embeddingData.vector.length
    });

    state.emitProgress?.('embedding_storage', 100, 'Embedding storage completed');

    return {
      embeddingStorage: {
        success: true,
        metadata: embeddingMetadata,
        // Store the raw embedding data for the document save process
        embeddingVector: embeddingData.vector,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.namespace('EmbeddingStorage').error('Embedding storage node error', {
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      embeddingStorage: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown embedding storage error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Check if embedding should be stored based on document characteristics
 */
function shouldStoreEmbedding(state: DocumentProcessingState): boolean {
  // Don't store if embedding generation failed or was skipped
  if (!state.embeddingGeneration?.success) {
    return false;
  }
  
  // Don't store if document is too short
  if (!state.text || state.text.trim().length < 50) {
    return false;
  }
  
  // Don't store if not medical content
  const isMedical = state.featureDetectionResults?.isMedical || 
                   (state.featureDetection && state.featureDetection.confidence > 0.5);
  
  return isMedical;
}

/**
 * Prepare embedding data for document integration
 */
export function prepareEmbeddingForDocument(state: DocumentProcessingState): {
  hasEmbedding: boolean;
  embeddingMetadata?: any;
  embeddingVector?: number[];
} {
  if (!state.embeddingStorage?.success) {
    return { hasEmbedding: false };
  }
  
  return {
    hasEmbedding: true,
    embeddingMetadata: state.embeddingStorage.metadata,
    embeddingVector: state.embeddingStorage.embeddingVector
  };
}