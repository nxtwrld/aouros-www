import { error, json } from '@sveltejs/kit';
import { getSession } from '$lib/session/manager';

/** @type {import('./$types.d').RequestHandler} */
export async function GET({ params, locals: { supabase, safeGetSession, user } }) {
    const { session } = await safeGetSession();

    if (!session || !user) {
        error(401, { message: 'Unauthorized' });
    }

    const sessionId = params.sessionId!;
    console.log('📡 Getting session status for:', sessionId);

    try {
        const sessionData = getSession(sessionId);
        
        if (!sessionData) {
            error(404, { message: 'Session not found' });
        }

        // Return current session state
        const response = {
            sessionId,
            status: sessionData.status,
            transcripts: sessionData.transcripts || [],
            analysis: sessionData.analysis || {},
            lastUpdated: new Date().toISOString()
        };

        console.log('📡 Session status response:', {
            sessionId,
            transcriptCount: response.transcripts.length,
            hasAnalysis: Object.keys(response.analysis).length > 0
        });

        return json(response);
    } catch (err) {
        console.error('Failed to get session status:', err);
        error(500, { message: 'Failed to get session status' });
    }
} 