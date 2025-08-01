/**
 * Server-Side Chat Context Service
 *
 * Handles chat context integration on the server side using
 * medical terms classification instead of embeddings.
 */

import { BaseChatContextService } from "../shared/chat-context-base";
import { logger } from "$lib/logging/logger";
import { classificationConfig } from "$lib/config/classification";
import { medicalExpertTools } from "../../mcp-tools/medical-expert-tools";

export class ServerChatContextService extends BaseChatContextService {
  /**
   * Extract medical terms from search query for document matching
   */
  protected async generateQueryEmbedding(query: string): Promise<Float32Array> {
    // This method is called by the base class but we'll override the search approach
    // Return empty Float32Array to maintain compatibility
    logger
      .namespace("ServerChatContext")
      .info("Using medical terms classification instead of embeddings", {
        queryLength: query.length,
      });
    return new Float32Array([]);
  }

  /**
   * Override the context preparation to use medical terms instead of embeddings
   */
  async prepareContextForChat(
    userMessage: string,
    options: any = {},
  ): Promise<any> {
    try {
      // Extract medical terms from the user message
      const queryTerms = this.extractMedicalTermsFromQuery(userMessage);

      logger
        .namespace("ServerChatContext")
        .info("Extracted medical terms for chat context", {
          medicalTerms: queryTerms.medicalTerms,
          categories: queryTerms.categories,
          temporalType: queryTerms.temporalType,
        });

      // Use MCP tools to search documents with medical terms
      const searchResult = await medicalExpertTools.searchDocuments(
        {
          terms: queryTerms.medicalTerms,
          limit: options.maxResults || 10,
          threshold: options.contextThreshold || 0.6,
        },
        options.profileId,
      );

      if (searchResult.isError || !searchResult.content) {
        logger
          .namespace("ServerChatContext")
          .warn("Document search failed or returned no results");
        return {
          assembledContext: undefined,
          availableTools: [],
          contextSummary: "No relevant medical context found.",
          documentCount: 0,
          confidence: 0,
          tokenUsage: 0,
        };
      }

      // Extract document data from MCP result
      const resourceContent = searchResult.content.find(
        (c) => c.type === "resource",
      );
      const documentsData = resourceContent?.resource;

      if (!documentsData?.documents?.length) {
        return {
          assembledContext: undefined,
          availableTools: [],
          contextSummary: "No relevant medical context found.",
          documentCount: 0,
          confidence: 0,
          tokenUsage: 0,
        };
      }

      // Convert search results to expected format
      const contextSummary = `Found ${documentsData.documents.length} relevant medical documents matching terms: ${queryTerms.medicalTerms.join(", ")}`;

      return {
        assembledContext: {
          summary: contextSummary,
          keyPoints: documentsData.documents.map((doc: any) => ({
            text: doc.summary || doc.excerpt,
            type: "finding",
            date: doc.date,
            confidence: doc.relevance,
            sourceDocumentId: doc.id,
          })),
          relevantDocuments: documentsData.documents.map((doc: any) => ({
            documentId: doc.id,
            type: doc.type,
            date: doc.date,
            excerpt: doc.summary || doc.excerpt,
            relevance: doc.relevance,
          })),
          confidence: Math.max(
            ...documentsData.documents.map((doc: any) => doc.relevance),
            0,
          ),
          tokenCount:
            contextSummary.length +
            documentsData.documents.reduce(
              (sum: number, doc: any) => sum + (doc.summary?.length || 0),
              0,
            ),
        },
        availableTools: [], // MCP tools are handled elsewhere
        contextSummary,
        documentCount: documentsData.documents.length,
        confidence: Math.max(
          ...documentsData.documents.map((doc: any) => doc.relevance),
          0,
        ),
        tokenUsage: contextSummary.length,
      };
    } catch (error) {
      logger
        .namespace("ServerChatContext")
        .error("Failed to prepare chat context with medical terms", {
          error: error instanceof Error ? error.message : String(error),
        });
      return {
        assembledContext: undefined,
        availableTools: [],
        contextSummary: "No relevant medical context found.",
        documentCount: 0,
        confidence: 0,
        tokenUsage: 0,
      };
    }
  }

  /**
   * Extract medical terms from chat query - expects English medical terms from AI
   */
  protected extractMedicalTermsFromQuery(query: string): {
    medicalTerms: string[];
    temporalType?: string;
    categories: string[];
  } {
    const lowercaseQuery = query.toLowerCase();
    const medicalTerms: string[] = [];
    const categories: string[] = [];
    let temporalType: string | undefined;

    // Extract categories from classification config (English terms only)
    for (const [, categoryData] of Object.entries(
      classificationConfig.categories,
    )) {
      if ((categoryData as any).keywords) {
        for (const keyword of (categoryData as any).keywords) {
          if (lowercaseQuery.includes(keyword.toLowerCase())) {
            categories.push((categoryData as any).id);
            medicalTerms.push(keyword);
          }
        }
      }
    }

    // Extract temporal terms (English only)
    for (const [, temporalData] of Object.entries(
      classificationConfig.temporalTerms,
    )) {
      if ((temporalData as any).examples) {
        for (const example of (temporalData as any).examples) {
          if (lowercaseQuery.includes(example.toLowerCase())) {
            temporalType = (temporalData as any).type;
            medicalTerms.push(example);
            break;
          }
        }
        if (temporalType) break;
      }
    }

    // Extract individual English words as potential medical terms
    const stopWords = new Set([
      "the",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "up",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "among",
      "around",
      "under",
      "over",
      "within",
      "without",
      "behind",
      "beyond",
      "beside",
      "beneath",
      "across",
      "against",
      "toward",
      "towards",
      "until",
      "unless",
      "although",
      "because",
      "since",
      "while",
      "where",
      "when",
      "what",
      "which",
      "who",
      "whom",
      "whose",
      "why",
      "how",
      "this",
      "that",
      "these",
      "those",
    ]);

    const queryWords = lowercaseQuery
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .filter((word) => /^[a-zA-Z0-9-]+$/.test(word)); // English alphanumeric terms and medical codes

    medicalTerms.push(...queryWords);

    return {
      medicalTerms: [...new Set(medicalTerms)], // Remove duplicates
      temporalType,
      categories: [...new Set(categories)],
    };
  }
}

// Export singleton instance for server-side use
export const serverChatContextService = new ServerChatContextService();
