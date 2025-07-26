/**
 * LangGraph Node: Embedding Generation
 * 
 * Generates document embeddings after successful document processing
 * and stores them encrypted alongside the document metadata.
 */

import type { DocumentProcessingState } from "../state";
import { serverEmbeddingService } from '$lib/context/embeddings/server-embedding-service';
import { logger } from '$lib/logging/logger';

/**
 * Generate embedding for processed document
 */
export async function embeddingGenerationNode(
  state: DocumentProcessingState
): Promise<Partial<DocumentProcessingState>> {
  try {
    logger.namespace('EmbeddingGeneration').info('Starting embedding generation', {
      hasMultiNodeResults: !!state.multiNodeResults,
      hasText: !!state.text,
      language: state.language
    });

    // Emit progress
    state.emitProgress?.('embedding_generation', 0, 'Preparing document content for embedding');

    // Check if we have sufficient content for embedding
    if (!state.text || state.text.trim().length < 50) {
      logger.namespace('EmbeddingGeneration').warn('Insufficient content for embedding generation', {
        textLength: state.text?.length || 0
      });
      
      return {
        embeddingGeneration: {
          skipped: true,
          reason: 'Insufficient content',
          timestamp: new Date().toISOString()
        }
      };
    }

    // Check if this is medical content worth embedding
    const isMedical = state.featureDetectionResults?.isMedical || 
                     (state.featureDetection && state.featureDetection.confidence > 0.5);
    
    if (!isMedical) {
      logger.namespace('EmbeddingGeneration').info('Skipping embedding for non-medical content');
      
      return {
        embeddingGeneration: {
          skipped: true,
          reason: 'Non-medical content',
          timestamp: new Date().toISOString()
        }
      };
    }

    state.emitProgress?.('embedding_generation', 50, 'Generating embedding vector');

    // Generate embedding using the server-side embedding service
    const embeddingResult = await serverEmbeddingService.generateDocumentEmbedding({
      id: generateDocumentId(state),
      type: state.documentTypeAnalysis?.predictedType || 'document',
      content: state.text,
      metadata: {
        language: state.language,
        processingDate: new Date().toISOString()
      }
    });

    state.emitProgress?.('embedding_generation', 75, 'Processing embedding result');

    if (!embeddingResult.success) {
      logger.namespace('EmbeddingGeneration').error('Embedding generation failed', {
        error: embeddingResult.error
      });
      
      return {
        embeddingGeneration: {
          success: false,
          error: embeddingResult.error,
          timestamp: new Date().toISOString()
        }
      };
    }

    state.emitProgress?.('embedding_generation', 100, 'Embedding generation completed');

    logger.namespace('EmbeddingGeneration').info('Embedding generation completed successfully', {
      embeddingDimensions: embeddingResult.embedding?.length || 0,
      provider: embeddingResult.provider,
      model: embeddingResult.model
    });

    // Return embedding metadata to be stored with document
    return {
      embeddingGeneration: {
        success: true,
        provider: embeddingResult.provider,
        model: embeddingResult.model,
        dimensions: embeddingResult.embedding?.length || 0,
        timestamp: new Date().toISOString(),
        // Store the actual embedding data for the storage node
        embeddingData: {
          vector: embeddingResult.embedding,
          metadata: {
            provider: embeddingResult.provider,
            model: embeddingResult.model,
            dimensions: embeddingResult.embedding?.length || 0,
            language: state.language,
            documentType: state.documentTypeAnalysis?.predictedType || 'document',
            processingDate: new Date().toISOString()
          }
        }
      }
    };

  } catch (error) {
    logger.namespace('EmbeddingGeneration').error('Embedding generation node error', {
      error: error instanceof Error ? error.message : String(error)
    });

    return {
      embeddingGeneration: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown embedding generation error',
        timestamp: new Date().toISOString()
      }
    };
  }
}


/**
 * Generate a consistent document ID for embedding
 */
function generateDocumentId(state: DocumentProcessingState): string {
  // Use existing metadata if available, otherwise generate based on content
  if (state.metadata?.documentId) {
    return state.metadata.documentId;
  }
  
  // Generate ID based on content hash and timestamp
  const contentHash = simpleHash(state.text || '');
  const timestamp = Date.now();
  return `doc_${contentHash}_${timestamp}`;
}

/**
 * Simple hash function for content
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}