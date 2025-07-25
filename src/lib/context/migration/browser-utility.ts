/**
 * Browser Utility for Embedding Migration
 * 
 * Provides easy-to-use functions for manual migration from browser console.
 * Useful for debugging and one-time migration tasks.
 */

import { 
  checkMigrationStatus, 
  migrateEmbeddings, 
  autoMigrateIfNeeded,
  MigrationProgressTracker
} from './client-migration';
import { logger } from '$lib/logging/logger';

/**
 * Global migration utilities for browser console
 * Usage in browser console:
 * 
 * // Check status
 * await window.migration.checkStatus()
 * 
 * // Migrate all documents
 * await window.migration.migrate()
 * 
 * // Auto-migrate if needed
 * await window.migration.autoMigrate()
 */
export const migrationUtils = {
  /**
   * Check migration status
   */
  async checkStatus(profileId?: string) {
    try {
      console.log('🔍 Checking migration status...');
      const status = await checkMigrationStatus(profileId);
      
      console.log('📊 Migration Status:', {
        totalDocuments: status.totalDocuments,
        documentsWithEmbeddings: status.documentsWithEmbeddings,
        documentsNeedingEmbeddings: status.documentsNeedingEmbeddings,
        migrationComplete: status.migrationComplete,
        completionPercentage: status.totalDocuments > 0 
          ? `${Math.round((status.documentsWithEmbeddings / status.totalDocuments) * 100)}%`
          : '0%'
      });
      
      if (status.migrationComplete) {
        console.log('✅ Migration is complete!');
      } else {
        console.log(`⚠️  ${status.documentsNeedingEmbeddings} documents need embeddings`);
        console.log('💡 Run `await window.migration.migrate()` to generate missing embeddings');
      }
      
      return status;
    } catch (error) {
      console.error('❌ Failed to check migration status:', error);
      throw error;
    }
  },

  /**
   * Migrate embeddings with progress tracking
   */
  async migrate(options: {
    profileId?: string;
    forceRegenerate?: boolean;
    batchSize?: number;
    documentTypes?: string[];
  } = {}) {
    try {
      console.log('🚀 Starting embedding migration...');
      console.log('Options:', options);
      
      const tracker = new MigrationProgressTracker(
        (progress) => {
          const percentage = Math.round((progress.processedDocuments / progress.totalDocuments) * 100);
          console.log(`📈 Progress: ${percentage}% (${progress.processedDocuments}/${progress.totalDocuments})`);
          console.log(`✅ Successful: ${progress.successfulEmbeddings}, ❌ Failed: ${progress.failedEmbeddings}, ⏭️  Skipped: ${progress.skippedDocuments}`);
        },
        (status) => {
          console.log(`📄 ${status}`);
        }
      );
      
      const result = await tracker.runMigration(options);
      
      console.log('🎉 Migration completed!');
      console.log('📊 Final Results:', {
        totalDocuments: result.progress.totalDocuments,
        successful: result.progress.successfulEmbeddings,
        failed: result.progress.failedEmbeddings,
        skipped: result.progress.skippedDocuments,
        errors: result.progress.errors.length
      });
      
      if (result.progress.errors.length > 0) {
        console.warn('⚠️  Errors encountered:', result.progress.errors);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  /**
   * Auto-migrate if needed (gentle approach)
   */
  async autoMigrate(profileId?: string) {
    try {
      console.log('🤖 Running auto-migration check...');
      
      const result = await autoMigrateIfNeeded(profileId);
      
      if (!result.migrationNeeded) {
        console.log('✅ No migration needed - all documents already have embeddings');
      } else if (result.migrationPerformed) {
        console.log('🎉 Auto-migration completed successfully!');
        console.log('📊 Results:', {
          documentsNeedingEmbeddings: result.status.documentsNeedingEmbeddings,
          successful: result.result?.progress.successfulEmbeddings || 0,
          failed: result.result?.progress.failedEmbeddings || 0
        });
      } else {
        console.log('⚠️  Migration needed but not performed automatically');
        console.log('💡 Run `await window.migration.migrate()` to manually trigger migration');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Auto-migration failed:', error);
      throw error;
    }
  },

  /**
   * Force regenerate all embeddings (use with caution)
   */
  async forceRegenerate(profileId?: string) {
    console.warn('⚠️  Force regenerating ALL embeddings - this may take a while...');
    const confirm = window.confirm('This will regenerate embeddings for ALL documents. Continue?');
    
    if (!confirm) {
      console.log('❌ Operation cancelled by user');
      return;
    }
    
    return this.migrate({
      profileId,
      forceRegenerate: true,
      batchSize: 3 // Smaller batches for heavy operation
    });
  },

  /**
   * Migrate specific document types only
   */
  async migrateTypes(documentTypes: string[], profileId?: string) {
    console.log(`🎯 Migrating specific document types: ${documentTypes.join(', ')}`);
    
    return this.migrate({
      profileId,
      documentTypes,
      batchSize: 5
    });
  },

  /**
   * Get detailed migration help
   */
  help() {
    console.log(`
🆘 Embedding Migration Help

Available commands:
• await window.migration.checkStatus()          - Check current migration status
• await window.migration.migrate()              - Migrate all documents needing embeddings
• await window.migration.autoMigrate()          - Auto-migrate if needed (gentle)
• await window.migration.forceRegenerate()      - Force regenerate ALL embeddings
• await window.migration.migrateTypes(['type']) - Migrate specific document types
• window.migration.help()                       - Show this help

Examples:
• await window.migration.migrate({ batchSize: 3 })                    - Migrate with smaller batches
• await window.migration.migrateTypes(['medical-record', 'lab-result']) - Migrate specific types
• await window.migration.migrate({ forceRegenerate: true })           - Force regenerate all

Migration is automatically triggered during profile loading if enabled.
For manual migration, use the commands above.
    `);
  }
};

/**
 * Initialize browser utilities
 */
export function initializeBrowserMigrationUtils() {
  if (typeof window !== 'undefined') {
    // Make migration utilities available globally
    (window as any).migration = migrationUtils;
    
    logger.namespace('Migration').info('Browser migration utilities initialized');
    console.log('🔧 Migration utilities available at window.migration');
    console.log('💡 Run window.migration.help() for available commands');
  }
}