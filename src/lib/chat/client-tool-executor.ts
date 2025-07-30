/**
 * Client-Side Tool Executor
 *
 * Replaces server-side MCP tools with direct client-side data access.
 * Uses authenticated user context and direct document access.
 */

import { getDocument } from "$lib/documents";
import { chatContextService } from "$lib/context/integration/chat-service";
import user from "$lib/user";
import type { ToolCallResult } from "./types.d";
import type { Document } from "$lib/documents/types.d";
import { logger } from "$lib/logging/logger";

const log = logger.namespace("ClientToolExecutor");

export interface ClientToolExecutorOptions {
  profileId: string;
}

export class ClientToolExecutor {
  private profileId: string;

  constructor(options: ClientToolExecutorOptions) {
    this.profileId = options.profileId;
  }

  /**
   * Execute a tool call directly on the client side
   */
  async executeTool(
    toolName: string,
    parameters: any,
  ): Promise<ToolCallResult> {
    const currentUser = user.get();
    if (!currentUser) {
      log.warn("Tool execution blocked - user not authenticated", {
        toolName,
        profileId: this.profileId,
      });

      return {
        toolName,
        success: false,
        error: "User not authenticated",
        timestamp: new Date(),
      };
    }

    log.info("Starting client-side tool execution", {
      toolName,
      profileId: this.profileId,
      userId: currentUser.id,
      userEmail: currentUser.email,
      parametersType: typeof parameters,
      parametersKeys:
        parameters && typeof parameters === "object"
          ? Object.keys(parameters)
          : [],
      parametersValue: parameters,
    });

    try {
      let result: ToolCallResult;

      switch (toolName) {
        case "getDocumentById":
          log.info("Routing to getDocumentById", {
            documentId: parameters?.documentId,
            profileId: this.profileId,
          });
          result = await this.getDocumentById(parameters?.documentId);
          break;

        case "searchDocuments":
          log.info("Routing to searchDocuments", {
            profileId: this.profileId,
            parametersForSearch: parameters,
          });
          result = await this.searchDocuments(parameters);
          break;

        case "getAssembledContext":
          log.info("Routing to getAssembledContext", {
            profileId: this.profileId,
            contextQuery: parameters?.query,
          });
          result = await this.getAssembledContext(parameters);
          break;

        case "queryMedicalHistory":
          log.info("Routing to queryMedicalHistory", {
            profileId: this.profileId,
            queryType: parameters?.queryType || parameters?.category,
          });
          result = await this.queryMedicalHistory(parameters);
          break;

        case "getProfileData":
          log.info("Routing to getProfileData", {
            profileId: this.profileId,
          });
          result = await this.getProfileData();
          break;

        default:
          const errorMsg = `Unknown tool: ${toolName}`;
          log.error("Unknown tool requested", {
            toolName,
            profileId: this.profileId,
            availableTools: [
              "getDocumentById",
              "searchDocuments",
              "getAssembledContext",
              "queryMedicalHistory",
              "getProfileData",
            ],
          });

          result = {
            toolName,
            success: false,
            error: errorMsg,
            timestamp: new Date(),
          };
      }

      log.info("Tool execution completed", {
        toolName,
        profileId: this.profileId,
        success: result.success,
        hasData: !!result.data,
        error: result.error || null,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error("Tool execution failed with exception", {
        toolName,
        profileId: this.profileId,
        parameters,
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      return {
        toolName,
        success: false,
        error: `Tool execution failed: ${errorMessage}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get document by ID - returns content without attachments
   */
  private async getDocumentById(documentId: string): Promise<ToolCallResult> {
    log.info("Get document by ID request", {
      profileId: this.profileId,
      documentId,
      hasDocumentId: !!documentId,
    });

    if (
      !documentId ||
      typeof documentId !== "string" ||
      documentId.trim() === ""
    ) {
      const errorMsg = `Document ID is required and must be a valid string. Received: ${documentId}`;
      log.error("Invalid document ID parameter", {
        profileId: this.profileId,
        documentId,
        error: errorMsg,
      });

      return {
        toolName: "getDocumentById",
        success: false,
        error: errorMsg,
        timestamp: new Date(),
      };
    }

    const cleanDocumentId = documentId.trim();

    try {
      log.info("Fetching document from storage", {
        profileId: this.profileId,
        documentId: cleanDocumentId,
      });

      const document = await getDocument(cleanDocumentId);

      if (!document) {
        const errorMsg = `Document not found with ID: ${cleanDocumentId}`;
        log.warn("Document not found", {
          profileId: this.profileId,
          documentId: cleanDocumentId,
        });

        return {
          toolName: "getDocumentById",
          success: false,
          error: errorMsg,
          timestamp: new Date(),
        };
      }

      // Return document content without attachments as requested
      const documentData = {
        id: document.id,
        title:
          document.metadata?.title ||
          document.content?.title ||
          "Untitled Document",
        content: document.content,
        metadata: document.metadata,
        type: document.type,
        user_id: document.user_id,
        // Explicitly exclude attachments as requested
        attachments: undefined,
      };

      log.info("Document retrieved successfully", {
        profileId: this.profileId,
        documentId: cleanDocumentId,
        title: documentData.title,
        hasContent: !!document.content,
        contentKeys: document.content ? Object.keys(document.content) : [],
      });

      return {
        toolName: "getDocumentById",
        success: true,
        data: documentData,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error("Failed to retrieve document", {
        profileId: this.profileId,
        documentId: cleanDocumentId,
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      return {
        toolName: "getDocumentById",
        success: false,
        error: `Failed to retrieve document: ${errorMessage}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Search documents using medical terms array - AI should provide terms directly
   */
  private async searchDocuments(parameters: any): Promise<ToolCallResult> {
    log.info("Search documents request - checking AI-provided parameters", {
      profileId: this.profileId,
      originalParameters: parameters,
      parameterType: typeof parameters,
      parameterKeys:
        parameters && typeof parameters === "object"
          ? Object.keys(parameters)
          : [],
      hasTermsArray: !!(parameters?.terms && Array.isArray(parameters.terms)),
    });

    // AI should provide terms array directly as per MCP tool description
    if (!parameters?.terms || !Array.isArray(parameters.terms)) {
      const errorMsg = `AI must provide medical terms as array. Expected: { terms: string[] }. Received: ${JSON.stringify(parameters)}`;
      log.error("AI called searchDocuments without terms array", {
        profileId: this.profileId,
        parameters,
        error: errorMsg,
      });

      return {
        toolName: "searchDocuments",
        success: false,
        error: errorMsg,
        timestamp: new Date(),
      };
    }

    // Filter and validate terms
    const terms = parameters.terms.filter((term: any) => 
      typeof term === 'string' && term.trim().length > 0
    );

    log.info("AI provided medical terms for search", {
      profileId: this.profileId,
      aiProvidedTerms: parameters.terms,
      validTermsCount: terms.length,
      filteredTerms: terms,
    });

    // Validate that we have valid terms
    if (terms.length === 0) {
      const errorMsg = `No valid medical terms provided. AI provided: ${JSON.stringify(parameters.terms)}`;
      log.error("No valid terms after filtering", {
        profileId: this.profileId,
        aiProvidedTerms: parameters.terms,
        error: errorMsg,
      });

      return {
        toolName: "searchDocuments",
        success: false,
        error: errorMsg,
        timestamp: new Date(),
      };
    }

    try {
      // Import medical expert tools directly to use the new interface
      const { medicalExpertTools } = await import('$lib/context/mcp-tools/medical-expert-tools');

      // Create search parameters object for the new MCP tool interface
      const searchParams = {
        terms: terms,
        limit: parameters?.limit || 10,
        threshold: parameters?.threshold || 0.6,
        includeContent: parameters?.includeContent !== false,
        documentTypes: parameters?.documentTypes,
      };

      log.info("Executing document search with medical terms", {
        profileId: this.profileId,
        searchTerms: terms,
        searchParams,
      });

      // Call the MCP tool directly with the new interface
      const result = await medicalExpertTools.searchDocuments(searchParams, this.profileId);

      // Check if the MCP tool returned an error
      if (result?.isError) {
        log.error("Search documents failed", {
          profileId: this.profileId,
          searchTerms: terms,
          error: result.content?.[0]?.text || "Unknown error",
        });

        return {
          toolName: "searchDocuments",
          success: false,
          error: result.content?.[0]?.text || "Document search failed",
          timestamp: new Date(),
        };
      }

      log.info("Search documents completed successfully", {
        profileId: this.profileId,
        searchTerms: terms,
        resultType: typeof result,
        resultContent: result?.content ? "has content" : "no content",
      });

      return {
        toolName: "searchDocuments",
        success: true,
        data: result,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error("Document search execution failed", {
        profileId: this.profileId,
        searchTerms: terms,
        originalParameters: parameters,
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      return {
        toolName: "searchDocuments",
        success: false,
        error: `Document search failed: ${errorMessage}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get assembled context using existing context service
   */
  private async getAssembledContext(parameters: any): Promise<ToolCallResult> {
    try {
      const contextResult = await chatContextService.prepareContextForChat(
        parameters.query || "Context request",
        {
          profileId: this.profileId,
          maxTokens: parameters.maxTokens || 2000,
          includeDocuments: true,
          ...parameters,
        },
      );

      return {
        toolName: "getAssembledContext",
        success: true,
        data: contextResult.assembledContext,
        timestamp: new Date(),
      };
    } catch (error) {
      log.error("Failed to get assembled context", { parameters, error });
      return {
        toolName: "getAssembledContext",
        success: false,
        error: error instanceof Error ? error.message : "Failed to get context",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Query medical history using existing context service
   */
  private async queryMedicalHistory(parameters: any): Promise<ToolCallResult> {
    try {
      const mcpTools = chatContextService.getMCPToolsForChat(this.profileId);
      const result = await mcpTools.queryMedicalHistory(
        parameters.queryType || parameters.category,
        parameters.timeframe,
      );

      return {
        toolName: "queryMedicalHistory",
        success: true,
        data: result,
        timestamp: new Date(),
      };
    } catch (error) {
      log.error("Failed to query medical history", { parameters, error });
      return {
        toolName: "queryMedicalHistory",
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to query medical history",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get profile data using existing context service
   */
  private async getProfileData(): Promise<ToolCallResult> {
    try {
      const mcpTools = chatContextService.getMCPToolsForChat(this.profileId);
      const result = await mcpTools.getProfileData();

      return {
        toolName: "getProfileData",
        success: true,
        data: result,
        timestamp: new Date(),
      };
    } catch (error) {
      log.error("Failed to get profile data", {
        profileId: this.profileId,
        error,
      });
      return {
        toolName: "getProfileData",
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get profile data",
        timestamp: new Date(),
      };
    }
  }
}
