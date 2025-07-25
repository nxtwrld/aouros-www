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

    state.emitProgress?.('embedding_generation', 25, 'Creating document summary for embedding');

    // Create summary optimized for embedding
    const documentSummary = createDocumentSummary(state);
    
    if (!documentSummary || documentSummary.length < 20) {
      logger.namespace('EmbeddingGeneration').warn('Failed to create adequate document summary');
      
      return {
        embeddingGeneration: {
          skipped: true,
          reason: 'Inadequate summary',
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
      summary: documentSummary,
      metadata: {
        language: state.language,
        processingDate: new Date().toISOString(),
        featureDetection: state.featureDetectionResults,
        multiNodeResults: state.multiNodeResults ? {
          processedNodes: state.multiNodeResults.processedNodes,
          hasAnalysis: !!state.multiNodeResults.medicalAnalysis,
          hasSignals: !!state.multiNodeResults.signals
        } : undefined
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
        summary: documentSummary,
        provider: embeddingResult.provider,
        model: embeddingResult.model,
        dimensions: embeddingResult.embedding?.length || 0,
        timestamp: new Date().toISOString(),
        // Store the actual embedding data for the storage node
        embeddingData: {
          vector: embeddingResult.embedding,
          summary: documentSummary,
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
 * Create document summary optimized for embedding generation
 */
function createDocumentSummary(state: DocumentProcessingState): string {
  const summaryParts: string[] = [];
  
  // Add document type if available
  if (state.documentTypeAnalysis?.predictedType) {
    summaryParts.push(`Document type: ${state.documentTypeAnalysis.predictedType}`);
  }
  
  // Add feature detection insights
  if (state.featureDetectionResults) {
    const features = state.featureDetectionResults;
    if (features.isMedical) {
      summaryParts.push('Medical document');
    }
    if (features.hasStructuredData) {
      summaryParts.push('Contains structured medical data');
    }
    if (features.hasTimestamps) {
      summaryParts.push('Contains timestamps');
    }
  }
  
  // Add multi-node analysis results if available
  if (state.multiNodeResults) {
    const multiNode = state.multiNodeResults;
    
    // Add medical analysis summary
    if (multiNode.medicalAnalysis) {
      const analysis = multiNode.medicalAnalysis;
      if (analysis.diagnosis && analysis.diagnosis.length > 0) {
        const diagnoses = analysis.diagnosis.slice(0, 3).map(d => d.name).join(', ');
        summaryParts.push(`Diagnoses: ${diagnoses}`);
      }
      if (analysis.medications && analysis.medications.length > 0) {
        const medications = analysis.medications.slice(0, 3).map(m => m.name).join(', ');
        summaryParts.push(`Medications: ${medications}`);
      }
      if (analysis.procedures && analysis.procedures.length > 0) {
        const procedures = analysis.procedures.slice(0, 2).map(p => p.name).join(', ');
        summaryParts.push(`Procedures: ${procedures}`);
      }
    }
    
    // Add signals summary
    if (multiNode.signals && multiNode.signals.length > 0) {
      const significantSignals = multiNode.signals
        .filter(s => s.urgency && s.urgency > 2)
        .slice(0, 3)
        .map(s => `${s.signal}: ${s.value}${s.unit || ''}`)
        .join(', ');
      if (significantSignals) {
        summaryParts.push(`Key vitals: ${significantSignals}`);
      }
    }
  }
  
  // Add original text excerpt (first 200 characters)
  if (state.text) {
    const textExcerpt = state.text.trim().substring(0, 200);
    summaryParts.push(`Content: ${textExcerpt}${state.text.length > 200 ? '...' : ''}`);
  }
  
  // Combine all parts
  const summary = summaryParts.join('. ');
  
  // Ensure summary is within reasonable limits (embedding models typically work best with 500-1000 chars)
  return summary.length > 800 ? summary.substring(0, 800) + '...' : summary;
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