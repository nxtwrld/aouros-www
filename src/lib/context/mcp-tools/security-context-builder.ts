/**
 * Security Context Builder
 * 
 * Utility functions to build MCPSecurityContext from various sources
 * like HTTP requests, SvelteKit events, and user sessions.
 */

import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';
import type { MCPSecurityContext } from './security-audit';

/**
 * Build security context from SvelteKit request event
 */
export function buildSecurityContextFromEvent(
  event: RequestEvent,
  user: User,
  profileId: string,
  sessionId?: string
): MCPSecurityContext {
  return {
    user,
    profileId,
    sessionId,
    ipAddress: getClientIP(event),
    userAgent: event.request.headers.get('user-agent') || undefined
  };
}

/**
 * Build security context from browser environment
 */
export function buildSecurityContextFromBrowser(
  user: User,
  profileId: string,
  sessionId?: string
): MCPSecurityContext {
  return {
    user,
    profileId,
    sessionId,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
  };
}

/**
 * Build security context for testing
 */
export function buildTestSecurityContext(
  userId: string,
  profileId: string,
  sessionId?: string
): MCPSecurityContext {
  return {
    user: {
      id: userId,
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      role: 'authenticated'
    },
    profileId,
    sessionId,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent'
  };
}

/**
 * Extract client IP address from request
 */
function getClientIP(event: RequestEvent): string {
  // Check various headers for the real client IP
  const headers = event.request.headers;
  
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('x-client-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    headers.get('x-forwarded') ||
    event.getClientAddress() ||
    'unknown'
  );
}

/**
 * Validate security context
 */
export function validateSecurityContext(context: MCPSecurityContext): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!context.user) {
    errors.push('User is required');
  } else {
    if (!context.user.id) {
      errors.push('User ID is required');
    }
  }
  
  if (!context.profileId) {
    errors.push('Profile ID is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize security context for logging
 */
export function sanitizeSecurityContext(context: MCPSecurityContext): Record<string, any> {
  return {
    userId: context.user?.id || 'anonymous',
    profileId: context.profileId,
    sessionId: context.sessionId,
    hasUser: !!context.user,
    hasIP: !!context.ipAddress,
    hasUserAgent: !!context.userAgent
  };
}