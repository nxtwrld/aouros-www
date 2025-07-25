/**
 * Embedding Migration API
 * 
 * Provides endpoints to migrate existing documents to have embeddings
 * for semantic search and context assembly.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { embeddingMigrationService } from '$lib/context/migration/embedding-migration';
import { logger } from '$lib/logging/logger';
import { profiles } from '$lib/profiles';

const migrationLogger = logger.namespace('MigrationAPI');

export const POST: RequestHandler = async ({ request, locals: { safeGetSession } }) => {
  try {
    // Verify authentication
    const { session } = await safeGetSession();
    if (!session) {
      migrationLogger.warn('Unauthorized migration attempt');
      error(401, { message: 'Unauthorized' });
    }

    const data = await request.json();
    const { 
      profileId = session.user.id,
      forceRegenerate = false,
      batchSize = 5,
      documentTypes
    } = data;

    migrationLogger.info('Starting embedding migration', {
      userId: session.user.id,
      profileId,
      forceRegenerate,
      batchSize
    });

    // Verify user can access this profile
    if (profileId !== session.user.id) {
      // Check if user has access to this profile
      const userProfiles = await profiles.list();
      const hasAccess = userProfiles.some(p => p.id === profileId);
      
      if (!hasAccess) {
        migrationLogger.warn('User attempted to migrate unauthorized profile', {
          userId: session.user.id,
          requestedProfileId: profileId
        });
        error(403, { message: 'Access denied to this profile' });
      }
    }

    // Check migration status first
    const status = await embeddingMigrationService.checkMigrationStatus(profileId);
    
    if (status.migrationComplete && !forceRegenerate) {
      migrationLogger.info('Migration already complete', {
        profileId,
        totalDocuments: status.totalDocuments,
        documentsWithEmbeddings: status.documentsWithEmbeddings
      });
      
      return json({
        success: true,
        message: 'Migration already complete',
        status,
        progress: {
          totalDocuments: status.totalDocuments,
          processedDocuments: status.totalDocuments,
          successfulEmbeddings: status.documentsWithEmbeddings,
          failedEmbeddings: 0,
          skippedDocuments: 0,
          errors: []
        }
      });
    }

    // Run migration
    const progress = await embeddingMigrationService.migrateProfileDocuments(profileId, {
      batchSize,
      forceRegenerate,
      documentTypes,
      delayBetweenBatches: 1000
    });

    migrationLogger.info('Migration completed', {
      profileId,
      totalDocuments: progress.totalDocuments,
      successful: progress.successfulEmbeddings,
      failed: progress.failedEmbeddings,
      skipped: progress.skippedDocuments
    });

    return json({
      success: true,
      message: 'Migration completed successfully',
      progress,
      status: await embeddingMigrationService.checkMigrationStatus(profileId)
    });

  } catch (err) {
    migrationLogger.error('Migration failed', {
      error: err instanceof Error ? err.message : String(err)
    });

    if (err instanceof Error && err.message.includes('API')) {
      error(503, { message: 'External embedding service error' });
    }

    error(500, { message: 'Migration failed', details: err instanceof Error ? err.message : String(err) });
  }
};

export const GET: RequestHandler = async ({ url, locals: { safeGetSession } }) => {
  try {
    // Verify authentication
    const { session } = await safeGetSession();
    if (!session) {
      error(401, { message: 'Unauthorized' });
    }

    const profileId = url.searchParams.get('profileId') || session.user.id;

    // Verify user can access this profile
    if (profileId !== session.user.id) {
      const userProfiles = await profiles.list();
      const hasAccess = userProfiles.some(p => p.id === profileId);
      
      if (!hasAccess) {
        error(403, { message: 'Access denied to this profile' });
      }
    }

    // Get migration status
    const status = await embeddingMigrationService.checkMigrationStatus(profileId);

    migrationLogger.debug('Migration status checked', {
      profileId,
      status
    });

    return json({
      success: true,
      profileId,
      status
    });

  } catch (err) {
    migrationLogger.error('Failed to check migration status', {
      error: err instanceof Error ? err.message : String(err)
    });

    error(500, { message: 'Failed to check migration status' });
  }
};