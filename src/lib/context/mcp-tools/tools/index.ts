/**
 * Medical Expert Tools Registry
 *
 * Central registry for all medical expert MCP tools
 */

import { SearchDocumentsTool } from "./search-documents";
import type { BaseMedicalTool, MCPTool } from "../base/base-tool";
import type { MCPSecurityContext } from "../security-audit";

// Registry of all available tools
const toolRegistry = new Map<string, BaseMedicalTool>();

// Register tools
toolRegistry.set("searchDocuments", new SearchDocumentsTool());

/**
 * Get all tool definitions for MCP
 */
export function getToolDefinitions(): MCPTool[] {
  return Array.from(toolRegistry.values()).map((tool) =>
    tool.getToolDefinition(),
  );
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  params: any,
  context: MCPSecurityContext,
): Promise<any> {
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return await (tool as any).secureToolCall(
    toolName,
    "execute",
    context,
    params,
    () => tool.execute(params, context.profileId),
  );
}

/**
 * Get tool by name
 */
export function getTool(toolName: string): BaseMedicalTool | undefined {
  return toolRegistry.get(toolName);
}

/**
 * List all available tool names
 */
export function getAvailableTools(): string[] {
  return Array.from(toolRegistry.keys());
}

// Export individual tools for direct access if needed
export { SearchDocumentsTool };
