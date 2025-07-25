/**
 * MCP Security and Audit System
 * 
 * Provides security validation, access control, and audit logging
 * for all MCP medical tool operations to ensure HIPAA compliance.
 */

import { logger } from '$lib/logging/logger';
import type { User } from '@supabase/supabase-js';

const auditLogger = logger.namespace('MCPAudit');

export interface MCPSecurityContext {
  user: User;
  profileId: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface MCPAccessPolicy {
  requireAuthentication: boolean;
  requireProfileOwnership: boolean;
  requireClinicalRole?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface MCPAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  profileId: string;
  toolName: string;
  operation: string;
  parameters: any;
  result: 'success' | 'denied' | 'error';
  errorMessage?: string;
  accessLevel: string;
  sensitivityLevel: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  dataAccessed?: string[];
  processingTimeMs?: number;
}

export class MCPSecurityService {
  private accessPolicies = new Map<string, MCPAccessPolicy>();
  private rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  private auditStore: MCPAuditEntry[] = [];
  
  constructor() {
    this.initializeAccessPolicies();
  }
  
  /**
   * Initialize access policies for each MCP tool
   */
  private initializeAccessPolicies() {
    // Basic search and context tools
    this.accessPolicies.set('searchDocuments', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'medium',
      rateLimit: { maxRequests: 100, windowMs: 60000 } // 100 requests per minute
    });
    
    this.accessPolicies.set('getAssembledContext', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'medium',
      rateLimit: { maxRequests: 50, windowMs: 60000 }
    });
    
    // Profile and medical history access
    this.accessPolicies.set('getProfileData', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'high',
      rateLimit: { maxRequests: 20, windowMs: 60000 }
    });
    
    this.accessPolicies.set('queryMedicalHistory', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'high',
      rateLimit: { maxRequests: 30, windowMs: 60000 }
    });
    
    // Document access
    this.accessPolicies.set('getDocumentById', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'high',
      rateLimit: { maxRequests: 50, windowMs: 60000 }
    });
    
    // Advanced medical analysis tools
    this.accessPolicies.set('getPatientTimeline', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'high',
      rateLimit: { maxRequests: 20, windowMs: 60000 }
    });
    
    this.accessPolicies.set('analyzeMedicalTrends', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'high',
      rateLimit: { maxRequests: 10, windowMs: 60000 }
    });
    
    this.accessPolicies.set('getMedicationHistory', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'critical',
      rateLimit: { maxRequests: 20, windowMs: 60000 }
    });
    
    this.accessPolicies.set('getTestResultSummary', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'critical',
      rateLimit: { maxRequests: 20, windowMs: 60000 }
    });
    
    this.accessPolicies.set('identifyMedicalPatterns', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'high',
      rateLimit: { maxRequests: 10, windowMs: 60000 }
    });
    
    this.accessPolicies.set('generateClinicalSummary', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'critical',
      requireClinicalRole: true,
      rateLimit: { maxRequests: 5, windowMs: 60000 }
    });
    
    this.accessPolicies.set('searchBySymptoms', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'medium',
      rateLimit: { maxRequests: 30, windowMs: 60000 }
    });
    
    this.accessPolicies.set('getSpecialtyRecommendations', {
      requireAuthentication: true,
      requireProfileOwnership: true,
      sensitivityLevel: 'medium',
      rateLimit: { maxRequests: 20, windowMs: 60000 }
    });
  }
  
  /**
   * Validate access to MCP tool
   */
  async validateAccess(
    toolName: string,
    context: MCPSecurityContext,
    parameters?: any
  ): Promise<{ allowed: boolean; reason?: string }> {
    const policy = this.accessPolicies.get(toolName);
    
    if (!policy) {
      auditLogger.warn('Access attempt to unknown tool', { toolName, userId: context.user?.id });
      return { allowed: false, reason: 'Unknown tool' };
    }
    
    // Check authentication
    if (policy.requireAuthentication && !context.user) {
      return { allowed: false, reason: 'Authentication required' };
    }
    
    // Check profile ownership
    if (policy.requireProfileOwnership) {
      const ownsProfile = await this.checkProfileOwnership(context.user.id, context.profileId);
      if (!ownsProfile) {
        return { allowed: false, reason: 'Profile access denied' };
      }
    }
    
    // Check clinical role if required
    if (policy.requireClinicalRole) {
      const hasClinicalRole = await this.checkClinicalRole(context.user.id);
      if (!hasClinicalRole) {
        return { allowed: false, reason: 'Clinical role required' };
      }
    }
    
    // Check rate limits
    if (policy.rateLimit) {
      const rateLimitKey = `${context.user.id}:${toolName}`;
      if (!this.checkRateLimit(rateLimitKey, policy.rateLimit)) {
        return { allowed: false, reason: 'Rate limit exceeded' };
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * Log tool access for audit trail
   */
  async logAccess(
    toolName: string,
    operation: string,
    context: MCPSecurityContext,
    parameters: any,
    result: 'success' | 'denied' | 'error',
    errorMessage?: string,
    dataAccessed?: string[],
    processingTimeMs?: number
  ): Promise<void> {
    const policy = this.accessPolicies.get(toolName);
    const auditEntry: MCPAuditEntry = {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      userId: context.user?.id || 'anonymous',
      profileId: context.profileId,
      toolName,
      operation,
      parameters: this.sanitizeParameters(parameters),
      result,
      errorMessage,
      accessLevel: context.user ? 'authenticated' : 'anonymous',
      sensitivityLevel: policy?.sensitivityLevel || 'unknown',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      dataAccessed,
      processingTimeMs
    };
    
    // Store audit entry
    this.auditStore.push(auditEntry);
    
    // Log based on sensitivity and result
    if (result === 'denied' || result === 'error') {
      auditLogger.warn('MCP tool access issue', {
        toolName,
        operation,
        userId: context.user?.id,
        result,
        reason: errorMessage
      });
    } else if (policy?.sensitivityLevel === 'critical') {
      auditLogger.info('Critical data access', {
        toolName,
        operation,
        userId: context.user?.id,
        profileId: context.profileId,
        dataAccessed: dataAccessed?.length || 0
      });
    }
    
    // Persist to database for long-term storage (implement based on your needs)
    await this.persistAuditEntry(auditEntry);
  }
  
  /**
   * Get audit trail for a profile
   */
  async getAuditTrail(
    profileId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      toolName?: string;
      userId?: string;
      limit?: number;
    }
  ): Promise<MCPAuditEntry[]> {
    let entries = this.auditStore.filter(entry => entry.profileId === profileId);
    
    if (options?.startDate) {
      entries = entries.filter(entry => new Date(entry.timestamp) >= options.startDate!);
    }
    
    if (options?.endDate) {
      entries = entries.filter(entry => new Date(entry.timestamp) <= options.endDate!);
    }
    
    if (options?.toolName) {
      entries = entries.filter(entry => entry.toolName === options.toolName);
    }
    
    if (options?.userId) {
      entries = entries.filter(entry => entry.userId === options.userId);
    }
    
    // Sort by timestamp descending
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }
    
    return entries;
  }
  
  /**
   * Check if user owns or has access to profile
   */
  private async checkProfileOwnership(userId: string, profileId: string): Promise<boolean> {
    // Implementation depends on your profile access model
    // For now, simple check - user can access their own profile
    // In production, this would check database permissions
    
    // TODO: Implement actual profile ownership check
    // This is a placeholder that assumes profileId contains userId
    return profileId.includes(userId) || userId === profileId;
  }
  
  /**
   * Check if user has clinical role
   */
  private async checkClinicalRole(userId: string): Promise<boolean> {
    // TODO: Implement actual role checking from database
    // This is a placeholder
    return false;
  }
  
  /**
   * Check rate limits
   */
  private checkRateLimit(
    key: string,
    limit: { maxRequests: number; windowMs: number }
  ): boolean {
    const now = Date.now();
    const rateLimitInfo = this.rateLimitStore.get(key);
    
    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      // New window or expired window
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + limit.windowMs
      });
      return true;
    }
    
    if (rateLimitInfo.count >= limit.maxRequests) {
      return false;
    }
    
    rateLimitInfo.count++;
    return true;
  }
  
  /**
   * Sanitize parameters for audit logging
   */
  private sanitizeParameters(parameters: any): any {
    if (!parameters) return {};
    
    // Remove or mask sensitive data
    const sanitized = { ...parameters };
    
    // Don't log full document content
    if (sanitized.documentContent) {
      sanitized.documentContent = '[REDACTED]';
    }
    
    // Mask any potential PII
    if (sanitized.query && sanitized.query.length > 100) {
      sanitized.query = sanitized.query.substring(0, 100) + '...[TRUNCATED]';
    }
    
    return sanitized;
  }
  
  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Persist audit entry to database
   */
  private async persistAuditEntry(entry: MCPAuditEntry): Promise<void> {
    // TODO: Implement database persistence
    // This would typically save to a database table for long-term storage
    // and compliance requirements
  }
  
  /**
   * Clean up old rate limit entries
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [key, info] of this.rateLimitStore.entries()) {
      if (now > info.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }
  
  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const entries = this.auditStore.filter(entry => {
      const timestamp = new Date(entry.timestamp);
      return timestamp >= startDate && timestamp <= endDate;
    });
    
    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    } else {
      // CSV format
      const headers = [
        'ID', 'Timestamp', 'User ID', 'Profile ID', 'Tool Name',
        'Operation', 'Result', 'Sensitivity Level', 'IP Address'
      ];
      
      const rows = entries.map(entry => [
        entry.id,
        entry.timestamp,
        entry.userId,
        entry.profileId,
        entry.toolName,
        entry.operation,
        entry.result,
        entry.sensitivityLevel,
        entry.ipAddress || ''
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }
}

// Export singleton instance
export const mcpSecurityService = new MCPSecurityService();

// Cleanup rate limits periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    mcpSecurityService.cleanupRateLimits();
  }, 60000); // Every minute
}