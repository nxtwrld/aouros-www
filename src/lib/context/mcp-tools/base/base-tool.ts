/**
 * Base Medical Tool Class
 *
 * Provides common functionality for all medical expert MCP tools
 */

import { byUser, getDocument } from "$lib/documents";
import user from "$lib/user";
import { profiles } from "$lib/profiles";
import { get } from "svelte/store";
import type { Document } from "$lib/documents/types.d";
import type { Profile } from "$lib/types.d";
import { logger } from "$lib/logging/logger";
import { mcpSecurityService, type MCPSecurityContext } from "../security-audit";
import { classificationConfig } from "$lib/config/classification";

// MCP-compliant tool result interface
export interface MCPToolResult {
  content: Array<{
    type: "text" | "resource";
    text?: string;
    resource?: any;
  }>;
  isError?: boolean;
}

// MCP Tool definition interface
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

// Tool execution function type
export type MCPToolHandler = (params: any) => Promise<MCPToolResult>;

export abstract class BaseMedicalTool {
  /**
   * Security wrapper for all MCP tool calls
   */
  protected async secureToolCall<T>(
    toolName: string,
    operation: string,
    context: MCPSecurityContext,
    parameters: any,
    handler: () => Promise<T>,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      // Validate access
      const accessResult = await mcpSecurityService.validateAccess(
        toolName,
        context,
        parameters,
      );
      if (!accessResult.allowed) {
        // Log access denial
        await mcpSecurityService.logAccess(
          toolName,
          operation,
          context,
          parameters,
          "denied",
          accessResult.reason,
          [],
          performance.now() - startTime,
        );

        throw new Error(`Access denied: ${accessResult.reason}`);
      }

      // Execute the tool
      const result = await handler();

      // Log successful access
      const dataAccessed = this.extractDataAccessInfo(result);
      await mcpSecurityService.logAccess(
        toolName,
        operation,
        context,
        parameters,
        "success",
        undefined,
        dataAccessed,
        performance.now() - startTime,
      );

      return result;
    } catch (error) {
      // Log error
      await mcpSecurityService.logAccess(
        toolName,
        operation,
        context,
        parameters,
        "error",
        error instanceof Error ? error.message : "Unknown error",
        [],
        performance.now() - startTime,
      );

      throw error;
    }
  }

  /**
   * Extract data access information from result for audit trail
   */
  protected extractDataAccessInfo(result: any): string[] {
    const dataAccessed: string[] = [];

    if (result && typeof result === "object") {
      if (result.content && Array.isArray(result.content)) {
        dataAccessed.push(`${result.content.length} content items`);
      }

      if (result.documentCount && typeof result.documentCount === "number") {
        dataAccessed.push(`${result.documentCount} documents`);
      }

      if (result.medications && Array.isArray(result.medications)) {
        dataAccessed.push(`${result.medications.length} medications`);
      }

      if (result.testResults && Array.isArray(result.testResults)) {
        dataAccessed.push(`${result.testResults.length} test results`);
      }
    }

    return dataAccessed;
  }

  /**
   * Extract document date from various possible fields
   */
  protected extractDocumentDate(doc: Document | any): Date | null {
    // Try different date fields in order of preference
    const possibleDateFields = [
      doc.metadata?.date,
      doc.metadata?.created_at,
      doc.created_at,
      doc.metadata?.timestamp,
      doc.timestamp,
    ];

    for (const dateField of possibleDateFields) {
      if (dateField) {
        const date = new Date(dateField);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  /**
   * Classify document temporally based on its date relative to other documents
   */
  protected classifyDocumentByDate(
    docDate: Date,
    allDocuments: (Document | any)[],
  ): string {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all document dates for comparison
    const documentDates = allDocuments
      .map((doc) => this.extractDocumentDate(doc))
      .filter((date) => date !== null)
      .sort((a, b) => b!.getTime() - a!.getTime()); // Sort newest first

    if (documentDates.length === 0) {
      return "historical"; // Default if no dates available
    }

    // If this document is the newest (or within top 10%), it's "latest"
    const topTenPercentIndex = Math.max(
      1,
      Math.floor(documentDates.length * 0.1),
    );
    const isInTopTenPercent = documentDates
      .slice(0, topTenPercentIndex)
      .some((date) => date!.getTime() === docDate.getTime());

    if (isInTopTenPercent) {
      return "latest";
    }

    // If within last 30 days, it's "recent"
    if (docDate >= thirtyDaysAgo) {
      return "recent";
    }

    // Otherwise it's "historical"
    return "historical";
  }

  /**
   * Get user documents for a profile
   */
  protected async getUserDocuments(
    profileId: string,
  ): Promise<(Document | any)[]> {
    const documentsStore = await byUser(profileId);
    return get(documentsStore);
  }

  /**
   * Get current user profile
   */
  protected async getCurrentUser(): Promise<any> {
    return get(user);
  }

  /**
   * Get profile by ID
   */
  protected async getProfile(profileId: string): Promise<Profile | null> {
    const profilesStore = get(profiles);
    return profilesStore.find((p) => p.id === profileId) || null;
  }

  /**
   * Abstract methods that must be implemented by each tool
   */
  abstract getToolDefinition(): MCPTool;
  abstract execute(params: any, profileId: string): Promise<MCPToolResult>;
}
