import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClient } from '$lib/supabase';
import { RecoveryKeyManager } from '$lib/encryption/recovery';
import { logger } from '$lib/logging/logger';

export const POST: RequestHandler = async ({ request, getClientAddress, headers }) => {
    try {
        const { recovery_phrase } = await request.json();

        if (!recovery_phrase || typeof recovery_phrase !== 'string') {
            return json({ 
                error: 'Invalid request',
                message: 'Recovery phrase is required' 
            }, { status: 400 });
        }

        // Validate mnemonic format
        const isValidFormat = await RecoveryKeyManager.validateMnemonicFormat(recovery_phrase);
        if (!isValidFormat) {
            logger.api.warn('Invalid recovery phrase format', { 
                ipAddress: getClientAddress(),
                userAgent: headers.get('user-agent') 
            });
            
            return json({ 
                error: 'Invalid recovery phrase',
                message: 'Recovery phrase format is invalid' 
            }, { status: 400 });
        }

        const supabase = getClient();
        
        // Find user by recovery phrase hash
        // We need to check all users' recovery hashes to find a match
        const { data: privateKeys, error: fetchError } = await supabase
            .from('private_keys')
            .select(`
                id,
                recovery_key,
                recovery_key_hash,
                profiles!inner(id, email)
            `)
            .not('recovery_key_hash', 'is', null);

        if (fetchError) {
            logger.api.error('Database error during recovery verification', { error: fetchError });
            return json({ 
                error: 'Database error',
                message: 'Failed to verify recovery phrase' 
            }, { status: 500 });
        }

        if (!privateKeys || privateKeys.length === 0) {
            logger.api.warn('No users with recovery keys found');
            return json({ 
                error: 'No recovery data',
                message: 'No accounts with recovery keys found' 
            }, { status: 404 });
        }

        // Check each user's recovery hash to find a match
        let matchedUser = null;
        for (const privateKey of privateKeys) {
            try {
                const verification = await RecoveryKeyManager.verifyRecoveryPhrase(
                    recovery_phrase,
                    privateKey.recovery_key_hash
                );
                
                if (verification.success) {
                    matchedUser = privateKey;
                    break;
                }
            } catch (error) {
                // Continue checking other users
                logger.api.debug('Recovery verification failed for user', { 
                    userId: privateKey.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        if (!matchedUser) {
            // Log failed attempt (we don't know which user, so log generally)
            await supabase
                .from('recovery_attempts')
                .insert({
                    user_id: null, // We don't know which user
                    attempt_type: 'mnemonic_verification',
                    success: false,
                    error_message: 'Recovery phrase not found',
                    ip_address: getClientAddress(),
                    user_agent: headers.get('user-agent')
                });

            logger.api.warn('Recovery phrase verification failed - no match found', {
                ipAddress: getClientAddress()
            });

            return json({ 
                error: 'Invalid recovery phrase',
                message: 'Recovery phrase does not match any account' 
            }, { status: 401 });
        }

        // Log successful verification
        await supabase
            .from('recovery_attempts')
            .insert({
                user_id: matchedUser.id,
                attempt_type: 'mnemonic_verification',
                success: true,
                ip_address: getClientAddress(),
                user_agent: headers.get('user-agent')
            });

        logger.api.info('Recovery phrase verified successfully', {
            userId: matchedUser.id,
            email: matchedUser.profiles.email
        });

        // Return user data needed for next step
        return json({
            success: true,
            user_id: matchedUser.id,
            email: matchedUser.profiles.email,
            recovery_key: matchedUser.recovery_key
        });

    } catch (error) {
        logger.api.error('Recovery verification error', { error });
        return json({ 
            error: 'Internal server error',
            message: 'An unexpected error occurred during recovery verification' 
        }, { status: 500 });
    }
};