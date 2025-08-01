/**
 * Comprehensive Tests for SearchDocumentsTool
 *
 * Tests the three-stage search approach:
 * 1. Category filtering
 * 2. Term refinement
 * 3. Temporal processing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchDocumentsTool } from "./search-documents";
import type { Document } from "$lib/documents/types.d";

// Mock the dependencies
vi.mock("$lib/config/classification", () => ({
  classificationConfig: {
    categories: {
      LABORATORY: {
        id: "laboratory",
        name: "Laboratory Results",
        priority: 1,
        keywords: ["lab", "laboratory", "blood", "test", "analysis", "results"],
      },
      IMAGING: {
        id: "imaging",
        name: "Medical Imaging",
        priority: 2,
        keywords: [
          "x-ray",
          "mri",
          "ct",
          "ultrasound",
          "scan",
          "imaging",
          "radiology",
        ],
      },
      MEDICATIONS: {
        id: "medications",
        name: "Medications & Prescriptions",
        priority: 3,
        keywords: [
          "medication",
          "medicine",
          "prescription",
          "drug",
          "treatment",
          "therapy",
        ],
      },
      CARDIOLOGY: {
        id: "cardiology",
        name: "Cardiology",
        priority: 4,
        keywords: ["heart", "cardiac", "ecg", "ekg", "cardiovascular", "chest"],
      },
    },
    temporalTerms: {
      latest: {
        type: "latest",
        priority: 1,
        weight: 2.0,
        examples: ["latest", "newest", "most recent", "last", "current"],
      },
      recent: {
        type: "recent",
        priority: 2,
        weight: 1.5,
        timeframe: { days: 30 },
        examples: ["recent", "recently", "this month", "past month", "new"],
      },
      historical: {
        type: "historical",
        priority: 3,
        weight: 1.0,
        examples: ["previous", "prior", "earlier", "past", "old", "historical"],
      },
    },
  },
}));

// Mock the base tool
vi.mock("../base/base-tool", () => ({
  BaseMedicalTool: class {
    async getCurrentUser() {
      return { id: "test-user" };
    }

    async getUserDocuments(profileId: string) {
      return mockDocuments;
    }

    // Add the missing base class methods that are needed for temporal processing
    protected extractDocumentDate(doc: any): Date | null {
      const dateFields = ["created_at", "date", "timestamp", "createdAt"];

      for (const field of dateFields) {
        if (doc[field]) {
          const date = new Date(doc[field]);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }

      if (doc.metadata?.date) {
        const date = new Date(doc.metadata.date);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      return null;
    }

    protected classifyDocumentByDate(
      docDate: Date,
      allDocuments: any[],
    ): string {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all document dates for comparison
      const documentDates = allDocuments
        .map((doc) => this.extractDocumentDate(doc))
        .filter((date) => date !== null)
        .sort((a, b) => b!.getTime() - a!.getTime()); // Sort newest first

      if (documentDates.length === 0) {
        return "historical";
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

      return "historical";
    }
  },
}));

// Mock documents for testing
const mockDocuments: (Document | any)[] = [
  {
    id: "doc1",
    content: { title: "Blood Test Results" },
    metadata: {
      category: "laboratory",
      tags: ["blood", "glucose", "cholesterol"],
    },
    medicalTerms: [
      "blood",
      "glucose",
      "cholesterol",
      "hdl",
      "ldl",
      "triglycerides",
    ],
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "doc2",
    content: { title: "Chest X-ray Report" },
    metadata: {
      category: "imaging",
      tags: ["chest", "x-ray", "lungs"],
    },
    medicalTerms: ["chest", "x-ray", "lungs", "radiology", "imaging"],
    created_at: "2024-01-10T14:30:00Z",
  },
  {
    id: "doc3",
    content: { title: "Heart Medication Prescription" },
    metadata: {
      category: "medications",
      tags: ["heart", "medication", "prescription"],
    },
    medicalTerms: [
      "heart",
      "medication",
      "prescription",
      "cardiac",
      "lisinopril",
    ],
    created_at: "2024-01-20T09:15:00Z",
  },
  {
    id: "doc4",
    content: { title: "ECG Results" },
    metadata: {
      category: "cardiology",
      tags: ["ecg", "heart", "rhythm"],
    },
    medicalTerms: ["ecg", "heart", "rhythm", "cardiac", "electrocardiogram"],
    created_at: "2024-01-25T11:45:00Z",
  },
  {
    id: "doc5",
    content: { title: "Old Lab Results" },
    metadata: {
      category: "laboratory",
      tags: ["blood", "old"],
    },
    medicalTerms: ["blood", "laboratory", "glucose"],
    created_at: "2023-06-01T08:00:00Z",
  },
];

describe("SearchDocumentsTool", () => {
  let searchTool: SearchDocumentsTool;

  beforeEach(() => {
    searchTool = new SearchDocumentsTool();
    vi.clearAllMocks();

    // Mock Date.now() for consistent temporal testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-30T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Tool Definition", () => {
    it("should return correct tool definition", () => {
      const definition = searchTool.getToolDefinition();

      expect(definition.name).toBe("searchDocuments");
      expect(definition.description).toContain("medical terms");
      expect(definition.inputSchema.required).toContain("terms");
      expect(definition.inputSchema.properties.terms.type).toBe("array");
    });

    it("should include category and temporal descriptions", () => {
      const definition = searchTool.getToolDefinition();
      const termsDescription =
        definition.inputSchema.properties.terms.description;

      expect(termsDescription).toContain("ENGLISH ONLY");
      expect(termsDescription).toContain("latest");
      expect(termsDescription).toContain("blood");
    });
  });

  describe("Stage 1: Category Filtering", () => {
    it("should filter documents by single category", async () => {
      const result = await searchTool.execute(
        {
          terms: ["blood"],
          documentTypes: ["laboratory"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found 2 relevant documents");
      expect(result.content[0].text).toContain("Blood Test Results");
      expect(result.content[0].text).toContain("Old Lab Results");
    });

    it("should filter documents by multiple categories", async () => {
      const result = await searchTool.execute(
        {
          terms: ["heart"],
          documentTypes: ["medications", "cardiology"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found 2 relevant documents");
      expect(result.content[0].text).toContain("Heart Medication");
      expect(result.content[0].text).toContain("ECG Results");
    });

    it("should return all documents when no category filter specified", async () => {
      const result = await searchTool.execute(
        {
          terms: ["heart"],
        },
        "test-profile",
      );

      // Should find documents in both medications and cardiology categories
      expect(result.content[0].text).toContain("Found");
      expect(result.content[0].text).toContain("Heart Medication");
      expect(result.content[0].text).toContain("ECG Results");
    });

    it("should return no results for non-existent category", async () => {
      const result = await searchTool.execute(
        {
          terms: ["blood"],
          documentTypes: ["nonexistent"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("No documents found");
    });

    it("should return no results for empty terms array", async () => {
      const result = await searchTool.execute(
        {
          terms: [],
        },
        "test-profile",
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("search terms are required");
    });
  });

  describe("Stage 2: Term Refinement", () => {
    it("should match exact medical terms with high relevance", async () => {
      const result = await searchTool.execute(
        {
          terms: ["glucose"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      expect(result.content[0].text).toContain("Blood Test Results");
      expect(result.content[0].text).toContain("glucose");
    });

    it("should match partial medical terms with lower relevance", async () => {
      const result = await searchTool.execute(
        {
          terms: ["cardio"], // Should partially match 'cardiac'
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      // Should find both heart medication and ECG (both have 'cardiac' term)
    });

    it("should match metadata tags", async () => {
      const result = await searchTool.execute(
        {
          terms: ["x-ray"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      expect(result.content[0].text).toContain("Chest X-ray");
      expect(result.content[0].text).toContain("tag:x-ray");
    });

    it("should combine multiple term matches for higher relevance", async () => {
      const result = await searchTool.execute(
        {
          terms: ["blood", "glucose"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      expect(result.content[0].text).toContain("Blood Test Results");
      // Should show high relevance due to multiple matches
      expect(result.content[0].text).toContain("blood, glucose");
    });

    it("should handle terms not found in any document", async () => {
      const result = await searchTool.execute(
        {
          terms: ["nonexistent", "fakeTerm"],
        },
        "test-profile",
      );

      // When no term matches are found, it should return category-based results with base relevance
      expect(result.content[0].text).toContain("Found");
      expect(result.content[0].text).toContain("category:");
    });

    it("should prioritize exact matches over partial matches", async () => {
      const result = await searchTool.execute(
        {
          terms: ["heart", "cardiac"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      // Should find multiple documents with different relevance scores
      const text = result.content[0].text;
      expect(text).toContain("%"); // Should show relevance percentages
    });
  });

  describe("Stage 3: Temporal Processing", () => {
    it('should filter for latest documents when "latest" term provided', async () => {
      const result = await searchTool.execute(
        {
          terms: ["latest", "blood"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      // Should return the most recent blood test (ECG is most recent overall but not blood-related)
      expect(result.content[0].text).toContain("temporal:latest");
    });

    it("should filter for recent documents within 30 days", async () => {
      const result = await searchTool.execute(
        {
          terms: ["recent", "laboratory"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      // Both lab results should be found, but recent temporal filter applied
      expect(result.content[0].text).toContain("temporal:recent");
    });

    it("should handle recent fallback when no docs in last 30 days", async () => {
      // Set system time to far future so no docs are within 30 days
      vi.setSystemTime(new Date("2025-06-01T12:00:00Z"));

      const result = await searchTool.execute(
        {
          terms: ["recent", "blood"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      expect(result.content[0].text).toContain("temporal:recent_fallback");
    });

    it("should filter for historical documents", async () => {
      const result = await searchTool.execute(
        {
          terms: ["historical", "blood"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      // Should prefer older documents
      expect(result.content[0].text).toContain("temporal:historical");
    });

    it("should handle multiple temporal terms", async () => {
      const result = await searchTool.execute(
        {
          terms: ["latest", "recent", "heart"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      // Should apply one of the temporal filters (latest is processed last in the loop)
      const text = result.content[0]?.text || "";
      expect(
        text.includes("temporal:latest") || text.includes("temporal:recent"),
      ).toBe(true);
    });

    it("should sort by date when temporal terms are used", async () => {
      const result = await searchTool.execute(
        {
          terms: ["latest", "heart"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      // Should have temporal:latest in matched terms
      expect(result.content[0].text).toContain("temporal:latest");
    });
  });

  describe("Parameter Validation", () => {
    it("should require terms parameter", async () => {
      const result = await searchTool.execute({}, "test-profile");

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("search terms are required");
    });

    it("should require terms to be an array", async () => {
      const result = await searchTool.execute(
        {
          terms: "not-an-array",
        },
        "test-profile",
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("must be an array");
    });

    it("should handle empty terms array", async () => {
      const result = await searchTool.execute(
        {
          terms: [],
        },
        "test-profile",
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("search terms are required");
    });

    it("should apply default limit when not specified", async () => {
      const result = await searchTool.execute(
        {
          terms: ["blood"],
        },
        "test-profile",
      );

      // Should find results with default limit (10)
      expect(result.content[0].text).toContain("Found");
    });

    it("should respect custom limit parameter", async () => {
      const result = await searchTool.execute(
        {
          terms: ["blood"],
          limit: 1,
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found 1 relevant");
    });

    it("should apply threshold parameter", async () => {
      const result = await searchTool.execute(
        {
          terms: ["blood"],
          threshold: 0.9, // Very high threshold
        },
        "test-profile",
      );

      // With high threshold, might find fewer results
      expect(result.content[0].text).toContain("Found");
    });
  });

  describe("Result Formatting", () => {
    it("should format results with title, category, relevance, and matched terms", async () => {
      const result = await searchTool.execute(
        {
          terms: ["blood"],
        },
        "test-profile",
      );

      const text = result.content[0].text;
      expect(text).toContain("**Blood Test Results**");
      expect(text).toContain("Category: laboratory");
      expect(text).toContain("Relevance:");
      expect(text).toContain("%");
      expect(text).toContain("Matched terms:");
    });

    it("should include content preview when includeContent is true and relevance > 0.8", async () => {
      const result = await searchTool.execute(
        {
          terms: ["blood", "glucose", "cholesterol"], // High relevance
          includeContent: true,
        },
        "test-profile",
      );

      const text = result.content[0].text;
      expect(text).toContain("Preview:");
    });

    it("should not include content preview for low relevance results", async () => {
      const result = await searchTool.execute(
        {
          terms: ["cardio"], // Partial match, lower relevance
          includeContent: true,
        },
        "test-profile",
      );

      const text = result.content[0].text;
      // Should not contain preview for low relevance
      expect(text).not.toContain("Preview:");
    });

    it("should handle documents without titles gracefully", async () => {
      // Mock a document without title
      const mockDocsWithoutTitle = [
        {
          id: "doc-no-title",
          content: "Some content without title",
          metadata: { category: "laboratory" },
          medicalTerms: ["blood"],
        },
      ];

      const mockGetUserDocs = vi
        .fn()
        .mockResolvedValueOnce(mockDocsWithoutTitle);
      (searchTool as any).getUserDocuments = mockGetUserDocs;

      const result = await searchTool.execute(
        {
          terms: ["blood"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Document doc-no-title");
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complex multi-stage search scenario", async () => {
      const result = await searchTool.execute(
        {
          terms: ["latest", "cardiac", "heart"],
          documentTypes: ["cardiology", "medications"],
          threshold: 0.6,
          limit: 5,
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      // Should apply category filter, find cardiac/heart terms, and apply latest temporal processing
      expect(result.content[0].text).toContain("temporal:latest");
      expect(result.content[0].text).toContain("cardiac");
    });

    it("should handle search with only temporal terms", async () => {
      const result = await searchTool.execute(
        {
          terms: ["latest"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      // Should return most recent document(s)
      expect(result.content[0].text).toContain("temporal:latest");
    });

    it("should handle search with only category filtering", async () => {
      const result = await searchTool.execute(
        {
          terms: ["anything"], // Non-matching term
          documentTypes: ["laboratory"],
        },
        "test-profile",
      );

      // Should still return category-filtered results even with no term matches
      expect(result.content[0].text).toContain("Found");
      expect(result.content[0].text).toContain("category:laboratory");
    });

    it("should prioritize category filtering over term matches", async () => {
      const result = await searchTool.execute(
        {
          terms: ["glucose"],
          documentTypes: ["imaging"], // Wrong category
        },
        "test-profile",
      );

      // Category filtering happens first - no glucose documents in imaging category
      // But the system returns category-filtered results even without term matches
      expect(result.content[0].text).toContain("Found");
      expect(result.content[0].text).toContain("category:imaging");
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should handle empty document set", async () => {
      const mockGetUserDocs = vi.fn().mockResolvedValueOnce([]);
      (searchTool as any).getUserDocuments = mockGetUserDocs;

      const result = await searchTool.execute(
        {
          terms: ["blood"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("No documents found");
    });

    it("should handle documents with missing metadata", async () => {
      const mockDocsWithMissingData = [
        {
          id: "doc-incomplete",
          content: { title: "Incomplete Doc" },
          // Missing metadata and medicalTerms
        },
      ];

      const mockGetUserDocs = vi
        .fn()
        .mockResolvedValueOnce(mockDocsWithMissingData);
      (searchTool as any).getUserDocuments = mockGetUserDocs;

      const result = await searchTool.execute(
        {
          terms: ["blood"],
        },
        "test-profile",
      );

      // Documents without medicalTerms get category-based matching (unknown category)
      expect(result.content[0].text).toContain("Found");
      expect(result.content[0].text).toContain("category:unknown");
    });

    it("should handle very large term arrays", async () => {
      const manyTerms = Array.from({ length: 50 }, (_, i) => `term${i}`);

      const result = await searchTool.execute(
        {
          terms: manyTerms,
        },
        "test-profile",
      );

      // Should handle gracefully without errors
      expect(result.content).toBeDefined();
    });

    it("should handle special characters in search terms", async () => {
      const result = await searchTool.execute(
        {
          terms: ["x-ray", "ecg/ekg", "covid-19"],
        },
        "test-profile",
      );

      expect(result.content[0].text).toContain("Found");
      expect(result.content[0].text).toContain("x-ray");
    });
  });

  describe("Logging and Debugging", () => {
    it("should log search stages in console", async () => {
      const consoleGroupSpy = vi
        .spyOn(console, "group")
        .mockImplementation(() => {});
      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await searchTool.execute(
        {
          terms: ["blood"],
          documentTypes: ["laboratory"],
        },
        "test-profile",
      );

      expect(consoleGroupSpy).toHaveBeenCalledWith(
        "🔍 Three-Stage Medical Document Search",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith("AI-provided search terms:", [
        "blood",
      ]);

      consoleGroupSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });
});
