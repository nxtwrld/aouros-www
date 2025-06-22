# AI Document Import - Implementation Examples

> **Navigation**: [← Architecture](./AI_IMPORT_03_ARCHITECTURE.md) | [README](./AI_IMPORT_README.md) | [Next: SSE Integration →](./AI_IMPORT_05_SSE_INTEGRATION.md)

This document provides detailed implementation examples for LangGraph nodes, edges, provider abstractions, and schema management systems.

## LangGraph Node Implementation

### Medical Classification Node

```typescript
// src/lib/workflows/document-import/nodes/medical-classifier.ts
import { traceNode } from "../../monitoring/tracing";
import { DocumentProcessingState } from "../state";
import { providerRegistry } from "../../providers/registry";
import { schemaRegistry } from "../../schemas/registry";

export const medicalClassifier = traceNode("medical_classifier")(
  async (state: DocumentProcessingState): Promise<Partial<DocumentProcessingState>> => {
    const { content, language, debugMode } = state;
    
    if (debugMode) {
      // Skip AI processing in debug mode
      return {
        isMedical: true,
        documentType: "report",
        tags: ["test"],
        hasLabOrVitals: false,
        hasPrescription: false,
        hasImmunization: false
      };
    }

    // Get optimal provider for classification
    const provider = providerRegistry.selectOptimalProvider({
      task: "classification",
      requirements: { supportsVision: true, fastResponse: true },
      preferences: { costOptimized: true }
    });

    // Get localized schema
    const schema = schemaRegistry.getSchema("feature-detection", language);

    try {
      // Perform classification
      const result = await provider.processVision(content, schema);
      
      // Validate medical document requirement
      if (!result.isMedical) {
        throw new Error("Not a medical document");
      }

      return {
        isMedical: result.isMedical,
        documentType: result.type,
        tags: result.tags,
        hasLabOrVitals: result.hasLabOrVitals,
        hasPrescription: result.hasPrescription,
        hasImmunization: result.hasImmunization,
        language: result.language
      };
    } catch (error) {
      return {
        errors: [...(state.errors || []), {
          node: "medical_classifier",
          message: error.message,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }
);
```

### Prescription Extraction Node

```typescript
// src/lib/workflows/document-import/nodes/prescription-extractor.ts
import { traceNode } from "../../monitoring/tracing";
import { DocumentProcessingState } from "../state";
import { providerRegistry } from "../../providers/registry";
import { schemaRegistry } from "../../schemas/registry";

export const prescriptionExtractor = traceNode("prescription_extractor")(
  async (state: DocumentProcessingState): Promise<Partial<DocumentProcessingState>> => {
    const { content, language, hasPrescription } = state;
    
    // Skip if no prescription detected
    if (!hasPrescription) {
      return { prescriptions: null };
    }

    // Select provider optimized for structured extraction
    const provider = providerRegistry.selectOptimalProvider({
      task: "structured_extraction",
      requirements: { supportsStructuredOutput: true },
      preferences: { accuracy: "high" }
    });

    const schema = schemaRegistry.getSchema("prescription", language);

    try {
      // Extract only text content for prescription analysis
      const textContent = content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      const result = await provider.processText(textContent, schema);
      
      return {
        prescriptions: result.prescriptions || null,
        providerChoices: [...(state.providerChoices || []), {
          node: "prescription_extractor",
          provider: provider.name,
          timestamp: new Date().toISOString()
        }]
      };
    } catch (error) {
      return {
        prescriptions: null,
        errors: [...(state.errors || []), {
          node: "prescription_extractor",
          message: error.message,
          timestamp: new Date().toISOString()
        }]
      };
    }
  }
);
```

## LangGraph Edge Implementation

### Document Type Router

```typescript
// src/lib/workflows/document-import/edges/document-type-router.ts
import { DocumentProcessingState } from "../state";

export function documentTypeRouter(state: DocumentProcessingState): string {
  const { documentType, errors } = state;
  
  // Check for errors first
  if (errors && errors.length > 0) {
    return "__end__";
  }
  
  // Route based on document type
  switch (documentType) {
    case "report":
      return "report";
    case "laboratory":
      return "laboratory";
    case "dental":
      return "dental";
    case "imaging":
    case "dicom":
      return "imaging";
    default:
      return "__end__"; // Unknown document type
  }
}
```

### Medical Classification Router

```typescript
// src/lib/workflows/document-import/edges/medical-router.ts
import { DocumentProcessingState } from "../state";

export function medicalRouter(state: DocumentProcessingState): string {
  const { isMedical, errors } = state;
  
  // Check for classification errors
  if (errors && errors.length > 0) {
    const hasClassificationError = errors.some(error => 
      error.node === "medical_classifier"
    );
    if (hasClassificationError) {
      return "not_medical";
    }
  }
  
  // Route based on medical classification
  return isMedical ? "medical" : "not_medical";
}
```

### Prescription Router with Parallel Processing

```typescript
// src/lib/workflows/document-import/edges/prescription-router.ts
import { DocumentProcessingState } from "../state";

export function prescriptionRouter(state: DocumentProcessingState): string[] {
  const { hasPrescription } = state;
  
  // Always proceed to immunization check, but track prescription processing
  const nextNodes = ["immunization_extractor"];
  
  // If prescription detected, this was already processed in parallel
  // The router just ensures proper flow continuation
  return nextNodes;
}
```

## Provider Implementation

### OpenAI Provider

```typescript
// src/lib/workflows/providers/implementations/openai-provider.ts
import { AIProvider, ProviderCapabilities } from "../base/provider.interface";
import { OpenAI } from "openai";
import { env } from '$env/dynamic/private';

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;
  
  readonly capabilities: ProviderCapabilities = {
    supportsVision: true,
    supportsStructuredOutput: true,
    contextWindow: 128000,
    costPerToken: 0.03,
    responseTime: 2000,
    reliability: 0.99
  };

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY
    });
  }

  async processVision(images: string[], schema: any): Promise<any> {
    const messages = [
      {
        role: "system" as const,
        content: `Extract structured data according to this schema: ${JSON.stringify(schema)}`
      },
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: "Analyze this medical document:" },
          ...images.map(image => ({
            type: "image_url" as const,
            image_url: { url: `data:image/jpeg;base64,${image}` }
          }))
        ]
      }
    ];

    const response = await this.client.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages,
      response_format: { type: "json_object" },
      max_tokens: 4000
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  }

  async processText(text: string, schema: any): Promise<any> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Extract structured data according to this schema: ${JSON.stringify(schema)}`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  }

  async estimateCost(operation: any): Promise<number> {
    // Simplified cost estimation
    const tokenCount = operation.text?.length / 4 || 1000; // Rough estimate
    return tokenCount * this.capabilities.costPerToken;
  }
}
```

### Google Gemini Provider

```typescript
// src/lib/workflows/providers/implementations/google-provider.ts
import { AIProvider, ProviderCapabilities } from "../base/provider.interface";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from '$env/dynamic/private';

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenerativeAI;
  
  readonly capabilities: ProviderCapabilities = {
    supportsVision: true,
    supportsStructuredOutput: true,
    contextWindow: 1000000,
    costPerToken: 0.0075,
    responseTime: 1500,
    reliability: 0.95
  };

  constructor() {
    this.client = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);
  }

  async processVision(images: string[], schema: any): Promise<any> {
    const model = this.client.getGenerativeModel({ model: "gemini-pro-vision" });
    
    const prompt = `Extract structured data according to this schema: ${JSON.stringify(schema)}. Return only valid JSON.`;
    
    const imageParts = images.map(image => ({
      inlineData: {
        data: image,
        mimeType: "image/jpeg"
      }
    }));

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    
    return JSON.parse(response.text());
  }

  async processText(text: string, schema: any): Promise<any> {
    const model = this.client.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Extract structured data from this text according to the schema: ${JSON.stringify(schema)}\n\nText: ${text}\n\nReturn only valid JSON.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return JSON.parse(response.text());
  }

  async estimateCost(operation: any): Promise<number> {
    const tokenCount = operation.text?.length / 4 || 1000;
    return tokenCount * this.capabilities.costPerToken;
  }
}
```

## Provider Registry

```typescript
// src/lib/workflows/providers/registry.ts
import { AIProvider } from "./base/provider.interface";
import { OpenAIProvider } from "./implementations/openai-provider";
import { GeminiProvider } from "./implementations/google-provider";
import { AnthropicProvider } from "./implementations/anthropic-provider";
import { GroqProvider } from "./implementations/groq-provider";

interface SelectionCriteria {
  task: "classification" | "structured_extraction" | "vision_analysis";
  requirements: {
    supportsVision?: boolean;
    supportsStructuredOutput?: boolean;
    fastResponse?: boolean;
  };
  preferences: {
    costOptimized?: boolean;
    accuracy?: "standard" | "high" | "critical";
  };
}

export class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private fallbackChains: Record<string, string[]> = {
    vision: ["openai", "gemini", "anthropic"],
    text: ["gemini", "openai", "anthropic"],
    structured: ["openai", "gemini", "groq"],
    fast: ["groq", "gemini", "openai"]
  };

  constructor() {
    this.registerProvider(new OpenAIProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new AnthropicProvider());
    this.registerProvider(new GroqProvider());
  }

  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
  }

  selectOptimalProvider(criteria: SelectionCriteria): AIProvider {
    const candidates = Array.from(this.providers.values()).filter(provider => {
      // Check requirements
      if (criteria.requirements.supportsVision && !provider.capabilities.supportsVision) {
        return false;
      }
      if (criteria.requirements.supportsStructuredOutput && !provider.capabilities.supportsStructuredOutput) {
        return false;
      }
      return true;
    });

    // Score providers based on preferences
    const scored = candidates.map(provider => ({
      provider,
      score: this.calculateScore(provider, criteria)
    }));

    // Sort by score and return best
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.provider || this.providers.get("openai")!;
  }

  private calculateScore(provider: AIProvider, criteria: SelectionCriteria): number {
    let score = 0;
    
    // Cost optimization
    if (criteria.preferences.costOptimized) {
      score += (1 / provider.capabilities.costPerToken) * 100;
    }
    
    // Speed preference
    if (criteria.requirements.fastResponse) {
      score += (3000 / provider.capabilities.responseTime) * 50;
    }
    
    // Reliability
    score += provider.capabilities.reliability * 100;
    
    return score;
  }

  getFallbackProvider(primaryProvider: string, task: string): AIProvider | null {
    const chain = this.fallbackChains[task] || this.fallbackChains.text;
    const currentIndex = chain.indexOf(primaryProvider);
    
    if (currentIndex < 0 || currentIndex >= chain.length - 1) {
      return null;
    }
    
    return this.providers.get(chain[currentIndex + 1]) || null;
  }
}

export const providerRegistry = new ProviderRegistry();
```

## Enhanced Schema Management

```typescript
// src/lib/workflows/schemas/registry.ts
import { EnhancedSchema } from "./base/enhanced-schema.interface";

export class SchemaRegistry {
  private schemas: Map<string, EnhancedSchema> = new Map();
  private localizedCache: Map<string, any> = new Map();

  registerSchema(schema: EnhancedSchema): void {
    this.schemas.set(schema.id, schema);
  }

  getSchema(type: string, language: string = "English"): any {
    const cacheKey = `${type}_${language}`;
    
    if (this.localizedCache.has(cacheKey)) {
      return this.localizedCache.get(cacheKey);
    }

    const schema = this.schemas.get(type);
    if (!schema) {
      throw new Error(`Schema not found: ${type}`);
    }

    const localized = this.localizeSchema(schema, language);
    this.localizedCache.set(cacheKey, localized);
    
    return localized;
  }

  private localizeSchema(schema: EnhancedSchema, language: string): any {
    if (schema.localizations[language]) {
      return schema.localizations[language];
    }

    // Fallback to base schema with language placeholder replacement
    const localized = JSON.parse(JSON.stringify(schema.baseSchema));
    return this.replacePlaceholders(localized, language);
  }

  private replacePlaceholders(obj: any, language: string): any {
    if (typeof obj === 'string') {
      return obj.replace(/\[LANGUAGE\]/g, language);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.replacePlaceholders(item, language));
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replacePlaceholders(value, language);
      }
      return result;
    }
    
    return obj;
  }

  validateOutput(data: any, schemaType: string): { valid: boolean; errors: string[] } {
    const schema = this.schemas.get(schemaType);
    if (!schema) {
      return { valid: false, errors: [`Schema not found: ${schemaType}`] };
    }

    // Implement validation logic based on schema.validation
    return { valid: true, errors: [] };
  }
}

export const schemaRegistry = new SchemaRegistry();
```

## Error Handling Patterns

### Node Error Wrapper

```typescript
// src/lib/workflows/document-import/utils/error-handlers.ts
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  nodeFunction: T,
  nodeName: string
): T {
  return (async (...args: any[]) => {
    try {
      return await nodeFunction(...args);
    } catch (error) {
      const state = args[0] as DocumentProcessingState;
      
      return {
        ...state,
        errors: [...(state.errors || []), {
          node: nodeName,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined
        }]
      };
    }
  }) as T;
}
```

### Provider Fallback Handler

```typescript
// src/lib/workflows/document-import/utils/provider-fallback.ts
export async function executeWithFallback<T>(
  operation: () => Promise<T>,
  providerName: string,
  task: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const fallbackProvider = providerRegistry.getFallbackProvider(providerName, task);
    
    if (fallbackProvider) {
      console.warn(`Provider ${providerName} failed, falling back to ${fallbackProvider.name}`);
      // Retry with fallback provider
      return await operation(); // Would need to pass fallback provider context
    }
    
    throw error;
  }
}
```

---

> **Next**: [SSE Integration](./AI_IMPORT_05_SSE_INTEGRATION.md) - Real-time progress streaming and user experience enhancements