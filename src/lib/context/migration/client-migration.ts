/**
 * Client-side Embedding Migration Utility
 * 
 * Provides client-side functions to check migration status and trigger
 * embedding generation for existing documents.
 */

import { logger } from '$lib/logging/logger';

const migrationLogger = logger.namespace('ClientMigration');

export interface MigrationStatus {
  totalDocuments: number;
  documentsWithEmbeddings: number;
  documentsNeedingEmbeddings: number;
  migrationComplete: boolean;
}

export interface MigrationProgress {
  totalDocuments: number;
  processedDocuments: number;
  successfulEmbeddings: number;
  failedEmbeddings: number;
  skippedDocuments: number;
  errors: Array<{
    documentId: string;
    error: string;
  }>;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  progress: MigrationProgress;
  status: MigrationStatus;
}

/**
 * Check migration status for current user's profile
 */
export async function checkMigrationStatus(profileId?: string): Promise<MigrationStatus> {
  try {
    const params = new URLSearchParams();
    if (profileId) {
      params.append('profileId', profileId);
    }

    const response = await fetch(`/v1/embeddings/migrate?${params}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Migration status check failed: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Migration status check failed');
    }

    return data.status;

  } catch (error) {
    migrationLogger.error('Failed to check migration status', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Trigger embedding migration for documents
 */
export async function migrateEmbeddings(options: {
  profileId?: string;
  forceRegenerate?: boolean;
  batchSize?: number;
  documentTypes?: string[];
} = {}): Promise<MigrationResult> {
  try {
    migrationLogger.info('Starting embedding migration', options);

    const response = await fetch('/v1/embeddings/migrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Migration failed: ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Migration failed: ${result.message}`);
    }

    migrationLogger.info('Migration completed', {
      totalDocuments: result.progress.totalDocuments,
      successful: result.progress.successfulEmbeddings,
      failed: result.progress.failedEmbeddings
    });

    return result;

  } catch (error) {
    migrationLogger.error('Migration failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Auto-check and migrate if needed (for seamless user experience)
 */
export async function autoMigrateIfNeeded(profileId?: string): Promise<{
  migrationNeeded: boolean;
  migrationPerformed: boolean;
  status: MigrationStatus;
  result?: MigrationResult;
}> {
  try {
    // Check current status
    const status = await checkMigrationStatus(profileId);
    
    // If migration is complete, no action needed
    if (status.migrationComplete) {
      migrationLogger.debug('Migration not needed, already complete', { status });
      return {
        migrationNeeded: false,
        migrationPerformed: false,
        status
      };
    }

    // If there are documents needing embeddings, trigger migration
    if (status.documentsNeedingEmbeddings > 0) {
      migrationLogger.info('Auto-triggering migration for missing embeddings', {
        documentsNeedingEmbeddings: status.documentsNeedingEmbeddings
      });

      const result = await migrateEmbeddings({
        profileId,
        batchSize: 3, // Smaller batches for background migration
        forceRegenerate: false
      });

      return {
        migrationNeeded: true,
        migrationPerformed: true,
        status: result.status,
        result
      };
    }

    return {
      migrationNeeded: false,
      migrationPerformed: false,
      status
    };

  } catch (error) {
    migrationLogger.error('Auto-migration failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    // Return status without migration if check fails
    try {
      const status = await checkMigrationStatus(profileId);
      return {
        migrationNeeded: true,
        migrationPerformed: false,
        status
      };
    } catch {
      // If even status check fails, return default
      return {
        migrationNeeded: true,
        migrationPerformed: false,
        status: {
          totalDocuments: 0,
          documentsWithEmbeddings: 0,
          documentsNeedingEmbeddings: 0,
          migrationComplete: false
        }
      };
    }
  }
}

/**
 * Progress tracker for migration UI
 */
export class MigrationProgressTracker {
  private progressCallback?: (progress: MigrationProgress) => void;
  private statusCallback?: (status: string) => void;

  constructor(
    progressCallback?: (progress: MigrationProgress) => void,
    statusCallback?: (status: string) => void
  ) {
    this.progressCallback = progressCallback;
    this.statusCallback = statusCallback;
  }

  async runMigration(options: {
    profileId?: string;
    forceRegenerate?: boolean;
    batchSize?: number;
    documentTypes?: string[];
  } = {}): Promise<MigrationResult> {
    try {
      this.statusCallback?.('Checking migration status...');
      const status = await checkMigrationStatus(options.profileId);

      if (status.migrationComplete && !options.forceRegenerate) {
        this.statusCallback?.('Migration already complete');
        return {
          success: true,
          message: 'Migration already complete',
          progress: {
            totalDocuments: status.totalDocuments,
            processedDocuments: status.totalDocuments,
            successfulEmbeddings: status.documentsWithEmbeddings,
            failedEmbeddings: 0,
            skippedDocuments: 0,
            errors: []
          },
          status
        };
      }

      this.statusCallback?.(`Migrating ${status.documentsNeedingEmbeddings} documents...`);
      
      const result = await migrateEmbeddings(options);
      
      this.progressCallback?.(result.progress);
      this.statusCallback?.('Migration completed successfully');

      return result;

    } catch (error) {
      this.statusCallback?.(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}