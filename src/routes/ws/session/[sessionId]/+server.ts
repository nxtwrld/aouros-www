import { handleWebSocketConnection } from '$lib/session/websocket';
import { getSession } from '$lib/session/manager';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params, url, request }) => {
    const sessionId = params.sessionId!;
    
    // Check if this is a WebSocket upgrade request
    if (request.headers.get('upgrade') !== 'websocket') {
        return new Response('Expected websocket', { status: 426 });
    }

    // Verify session exists
    const session = getSession(sessionId);
    if (!session) {
        return new Response('Session not found', { status: 404 });
    }

    try {
        // Create WebSocket response
        const { socket, response } = new WebSocketPair();

        // Handle the WebSocket connection
        handleWebSocketConnection(socket as any, sessionId);

        return response;
    } catch (error) {
        console.error('WebSocket connection error:', error);
        return new Response('WebSocket connection failed', { status: 500 });
    }
}; 