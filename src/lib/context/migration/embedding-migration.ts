/**
 * Embedding Migration Utility
 * 
 * Generates embeddings for existing documents that don't have them yet.
 * This ensures all documents are available for semantic search and context assembly.
 */

import { loadDocuments, getDocument } from '$lib/documents';
import { profileContextManager } from '../integration/profile-context';
import { logger } from '$lib/logging/logger';
import type { Document } from '$lib/documents/types.d';

const migrationLogger = logger.namespace('EmbeddingMigration');

export interface MigrationProgress {
  totalDocuments: number;
  processedDocuments: number;
  successfulEmbeddings: number;
  failedEmbeddings: number;
  skippedDocuments: number;
  currentDocument?: string;
  errors: Array<{
    documentId: string;
    error: string;
  }>;
}

export interface MigrationOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  forceRegenerate?: boolean;
  onProgress?: (progress: MigrationProgress) => void;
  documentTypes?: string[];
}

export class EmbeddingMigrationService {
  
  /**
   * Migrate all documents for a specific profile
   */
  async migrateProfileDocuments(
    profileId: string,
    options: MigrationOptions = {}
  ): Promise<MigrationProgress> {
    const {
      batchSize = 5,
      delayBetweenBatches = 1000,
      forceRegenerate = false,
      onProgress,
      documentTypes
    } = options;

    migrationLogger.info('Starting document embedding migration', {
      profileId,
      batchSize,
      forceRegenerate
    });

    // Initialize profile context if needed
    const contextStats = profileContextManager.getProfileContextStats(profileId);
    if (!contextStats) {
      migrationLogger.info('Initializing profile context', { profileId });
      await profileContextManager.initializeProfileContext(profileId);
    }

    // Load all documents for the profile
    const allDocuments = await this.loadProfileDocuments(profileId);
    
    // Filter documents if types specified
    const documentsToProcess = documentTypes 
      ? allDocuments.filter(doc => documentTypes.includes(doc.metadata?.type || 'unknown'))
      : allDocuments;

    const progress: MigrationProgress = {
      totalDocuments: documentsToProcess.length,
      processedDocuments: 0,
      successfulEmbeddings: 0,
      failedEmbeddings: 0,
      skippedDocuments: 0,
      errors: []
    };

    migrationLogger.info('Documents to process', {
      total: progress.totalDocuments,
      filtered: documentTypes ? allDocuments.length - documentsToProcess.length : 0
    });

    // Process documents in batches
    for (let i = 0; i < documentsToProcess.length; i += batchSize) {
      const batch = documentsToProcess.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (document) => {
          progress.currentDocument = document.id;
          if (onProgress) onProgress({ ...progress });

          try {
            const result = await this.processDocument(document, profileId, forceRegenerate);
            
            if (result.success) {
              if (result.generated) {
                progress.successfulEmbeddings++;
              } else {
                progress.skippedDocuments++;
              }
            } else {
              progress.failedEmbeddings++;
              progress.errors.push({
                documentId: document.id,
                error: result.error || 'Unknown error'
              });
            }
          } catch (error) {
            progress.failedEmbeddings++;
            progress.errors.push({
              documentId: document.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            migrationLogger.error('Document processing failed', {
              documentId: document.id,
              error: error instanceof Error ? error.message : error
            });
          }

          progress.processedDocuments++;
        })
      );

      // Progress callback
      if (onProgress) onProgress({ ...progress });

      // Delay between batches to avoid overwhelming the system
      if (i + batchSize < documentsToProcess.length && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    progress.currentDocument = undefined;
    
    migrationLogger.info('Migration completed', {
      profileId,
      totalDocuments: progress.totalDocuments,
      successful: progress.successfulEmbeddings,
      failed: progress.failedEmbeddings,
      skipped: progress.skippedDocuments,
      errors: progress.errors.length
    });

    return progress;
  }

  /**
   * Migrate documents for all profiles (admin function)
   */
  async migrateAllProfiles(
    profileIds: string[],
    options: MigrationOptions = {}
  ): Promise<Record<string, MigrationProgress>> {
    const results: Record<string, MigrationProgress> = {};
    
    migrationLogger.info('Starting migration for all profiles', {
      profileCount: profileIds.length
    });

    for (const profileId of profileIds) {
      try {
        migrationLogger.info('Starting profile migration', { profileId });
        results[profileId] = await this.migrateProfileDocuments(profileId, options);
      } catch (error) {
        migrationLogger.error('Profile migration failed', {
          profileId,
          error: error instanceof Error ? error.message : error
        });
        
        results[profileId] = {
          totalDocuments: 0,
          processedDocuments: 0,
          successfulEmbeddings: 0,
          failedEmbeddings: 1,
          skippedDocuments: 0,
          errors: [{
            documentId: 'profile',
            error: error instanceof Error ? error.message : 'Unknown error'
          }]
        };
      }
    }

    return results;
  }

  /**
   * Check migration status for a profile
   */
  async checkMigrationStatus(profileId: string): Promise<{
    totalDocuments: number;
    documentsWithEmbeddings: number;
    documentsNeedingEmbeddings: number;
    migrationComplete: boolean;
  }> {
    const documents = await this.loadProfileDocuments(profileId);
    const contextStats = profileContextManager.getProfileContextStats(profileId);
    
    const documentsWithEmbeddings = contextStats?.documentCount || 0;
    const documentsNeedingEmbeddings = documents.length - documentsWithEmbeddings;
    
    return {
      totalDocuments: documents.length,
      documentsWithEmbeddings,
      documentsNeedingEmbeddings,
      migrationComplete: documentsNeedingEmbeddings === 0
    };
  }

  /**
   * Process a single document for embedding generation
   */
  private async processDocument(
    document: Document,
    profileId: string,
    forceRegenerate: boolean = false
  ): Promise<{
    success: boolean;
    generated: boolean;
    error?: string;
  }> {
    try {
      // Check if document already has embedding (unless forcing regeneration)
      if (!forceRegenerate) {
        const contextStats = profileContextManager.getProfileContextStats(profileId);
        if (contextStats?.database) {
          // Check if document exists in context database
          const existingDocument = await this.checkDocumentInContext(document.id, contextStats.database);
          if (existingDocument) {
            migrationLogger.debug('Document already has embedding, skipping', {
              documentId: document.id
            });
            return { success: true, generated: false };
          }
        }
      }

      // Check if document has suitable content for embedding
      if (!this.isDocumentSuitableForEmbedding(document)) {
        migrationLogger.debug('Document not suitable for embedding', {
          documentId: document.id,
          type: document.metadata?.type
        });
        return { success: true, generated: false };
      }

      // Generate embedding
      migrationLogger.debug('Generating embedding for document', {
        documentId: document.id,
        type: document.metadata?.type
      });

      await profileContextManager.addDocumentToContext(
        profileId,
        document,
        {
          generateEmbedding: true,
          forceRegenerate
        }
      );

      migrationLogger.debug('Successfully generated embedding', {
        documentId: document.id
      });

      return { success: true, generated: true };

    } catch (error) {
      migrationLogger.error('Failed to process document', {
        documentId: document.id,
        error: error instanceof Error ? error.message : error
      });

      return {
        success: false,
        generated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load all documents for a profile
   */
  private async loadProfileDocuments(profileId: string): Promise<Document[]> {
    try {
      // This loads all documents for the current user
      // We'll need to ensure we're loading for the correct profile
      const documents = await loadDocuments();
      
      // Filter by profile if needed (documents might be shared across profiles)
      return documents.filter(doc => 
        doc.profile_id === profileId || 
        doc.user_id === profileId || // Fallback for older documents
        (!doc.profile_id && !doc.user_id) // Include documents without profile info
      );
    } catch (error) {
      migrationLogger.error('Failed to load profile documents', {
        profileId,
        error: error instanceof Error ? error.message : error
      });
      return [];
    }
  }

  /**
   * Check if document exists in context database
   */
  private async checkDocumentInContext(documentId: string, database: any): Promise<boolean> {
    try {
      // This is a simplified check - in reality, you'd check the actual database
      // For now, we'll rely on the context stats
      return false; // Always regenerate for migration
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if document is suitable for embedding generation
   */
  private isDocumentSuitableForEmbedding(document: Document): boolean {
    // Skip documents without content
    if (!document.content) {
      return false;
    }

    // Skip very short documents
    const textContent = this.extractTextContent(document);
    if (textContent.length < 50) {
      return false;
    }

    // Skip certain document types that shouldn't have embeddings
    const skipTypes = ['image', 'video', 'audio', 'binary'];
    if (skipTypes.includes(document.metadata?.type || '')) {
      return false;
    }

    return true;
  }

  /**
   * Extract text content from document for length checking
   */
  private extractTextContent(document: Document): string {
    let content = '';
    
    if (typeof document.content === 'string') {
      content = document.content;
    } else if (document.content && typeof document.content === 'object') {
      // Extract text from various content structures
      if (document.content.text) {
        content = document.content.text;
      } else if (document.content.content) {
        content = document.content.content;
      } else if (document.content.body) {
        content = document.content.body;
      }
    }
    
    return content;
  }

  /**
   * Get migration statistics for reporting
   */
  generateMigrationReport(results: Record<string, MigrationProgress>): {
    totalProfiles: number;
    totalDocuments: number;
    totalSuccessful: number;
    totalFailed: number;
    totalSkipped: number;
    profilesWithErrors: number;
    errorSummary: Array<{ profileId: string; errorCount: number; errors: string[] }>;
  } {
    const report = {
      totalProfiles: Object.keys(results).length,
      totalDocuments: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      totalSkipped: 0,
      profilesWithErrors: 0,
      errorSummary: [] as Array<{ profileId: string; errorCount: number; errors: string[] }>
    };

    for (const [profileId, progress] of Object.entries(results)) {
      report.totalDocuments += progress.totalDocuments;
      report.totalSuccessful += progress.successfulEmbeddings;
      report.totalFailed += progress.failedEmbeddings;
      report.totalSkipped += progress.skippedDocuments;

      if (progress.errors.length > 0) {
        report.profilesWithErrors++;
        report.errorSummary.push({
          profileId,
          errorCount: progress.errors.length,
          errors: progress.errors.map(e => e.error)
        });
      }
    }

    return report;
  }
}

// Export singleton instance
export const embeddingMigrationService = new EmbeddingMigrationService();