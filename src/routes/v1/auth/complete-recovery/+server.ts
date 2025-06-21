import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClient } from '$lib/supabase';
import { logger } from '$lib/logging/logger';

export const POST: RequestHandler = async ({ request, getClientAddress, headers }) => {
    try {
        const { 
            user_id, 
            new_private_key, 
            new_public_key, 
            new_key_hash,
            new_recovery_key,
            new_recovery_hash 
        } = await request.json();

        // Validate required fields
        if (!user_id || !new_private_key || !new_public_key || !new_key_hash || !new_recovery_key || !new_recovery_hash) {
            return json({ 
                error: 'Invalid request',
                message: 'All recovery data fields are required' 
            }, { status: 400 });
        }

        const supabase = getClient();
        
        // Verify user exists and has recovery data
        const { data: existingUser, error: userError } = await supabase
            .from('private_keys')
            .select(`
                id,
                profiles!inner(id, email)
            `)
            .eq('id', user_id)
            .single();

        if (userError || !existingUser) {
            logger.api.error('User not found during recovery completion', { 
                userId: user_id, 
                error: userError 
            });
            return json({ 
                error: 'User not found',
                message: 'Invalid user ID for recovery' 
            }, { status: 404 });
        }

        // Update user's encryption keys and recovery data
        const { error: updateError } = await supabase
            .from('private_keys')
            .update({
                private_key: new_private_key,
                public_key: new_public_key,
                key_hash: new_key_hash,
                recovery_key: new_recovery_key,
                recovery_key_hash: new_recovery_hash,
                key_version: supabase.rpc('coalesce', { value: 'key_version', fallback: 0 }) + 1,
                recovery_verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', user_id);

        if (updateError) {
            logger.api.error('Failed to update user keys during recovery', { 
                userId: user_id, 
                error: updateError 
            });
            return json({ 
                error: 'Database error',
                message: 'Failed to complete account recovery' 
            }, { status: 500 });
        }

        // Log successful recovery completion
        await supabase
            .from('recovery_attempts')
            .insert({
                user_id: user_id,
                attempt_type: 'recovery_completion',
                success: true,
                ip_address: getClientAddress(),
                user_agent: headers.get('user-agent')
            });

        logger.api.info('Account recovery completed successfully', {
            userId: user_id,
            email: existingUser.profiles.email
        });

        return json({
            success: true,
            message: 'Account recovery completed successfully',
            user_id: user_id
        });

    } catch (error) {
        logger.api.error('Recovery completion error', { error });
        return json({ 
            error: 'Internal server error',
            message: 'An unexpected error occurred during recovery completion' 
        }, { status: 500 });
    }
};