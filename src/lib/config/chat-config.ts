import chatConfig from '../../../config/chat.json';
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { modelConfig } from './model-config';
import anatomyObjects from '$components/anatomy/objects.json';

export interface ChatProvider {
  name: string;
  enabled: boolean;
  models: {
    streaming: ModelConfig;
    structured: ModelConfig;
  };
}

export interface ModelConfig {
  name: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatConfig {
  providers: Record<string, ChatProvider>;
  defaultProvider: string;
  fallbackProvider: string;
  conversationHistory: {
    maxMessages: number;
    includeSystemMessages: boolean;
  };
  prompts: {
    base: {
      instruction: string;
    };
    patient: PromptConfig;
    clinical: PromptConfig;
  };
  documentContext: {
    enabled: boolean;
    includeFields: string[];
    includeAdditionalContent: boolean;
    maxDocuments: number;
  };
  responseSchema: {
    base: any;
  };
  languages: Record<string, string>;
}

export interface PromptConfig {
  systemPrompt: {
    title: string;
    guidelines: string[];
    anatomyInstructions: string[];
    boundaries?: string[];
    focus?: string[];
  };
  responseSchema: {
    additionalProperties: Record<string, any>;
  };
}

class ChatConfigManager {
  private config: ChatConfig = chatConfig as ChatConfig;

  /**
   * Get the current chat configuration
   */
  getConfig(): ChatConfig {
    return this.config;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Object.keys(this.config.providers).filter(
      provider => this.config.providers[provider].enabled
    );
  }

  /**
   * Get a provider configuration
   */
  getProviderConfig(provider: string): ChatProvider {
    if (!this.config.providers[provider]) {
      throw new Error(`Provider '${provider}' not found in configuration`);
    }
    return this.config.providers[provider];
  }

  /**
   * Create a chat model instance for streaming
   */
  createStreamingModel(provider?: string): any {
    const providerName = provider || this.config.defaultProvider;
    const providerConfig = this.getProviderConfig(providerName);
    
    if (!providerConfig.enabled) {
      throw new Error(`Provider '${providerName}' is not enabled`);
    }

    const modelConfig = providerConfig.models.streaming;

    switch (providerName) {
      case 'openai':
        return new ChatOpenAI({
          model: modelConfig.name,
          apiKey: this.getProviderApiKey('openai'),
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          streaming: true,
        });

      case 'gemini':
        return new ChatGoogleGenerativeAI({
          model: modelConfig.name,
          apiKey: this.getProviderApiKey('gemini'),
          temperature: modelConfig.temperature,
          maxOutputTokens: modelConfig.maxTokens,
          streaming: true,
        });

      case 'anthropic':
        return new ChatAnthropic({
          model: modelConfig.name,
          apiKey: this.getProviderApiKey('anthropic'),
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          streaming: true,
        });

      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  /**
   * Create a chat model instance for structured output
   */
  createStructuredModel(provider?: string): any {
    const providerName = provider || this.config.defaultProvider;
    const providerConfig = this.getProviderConfig(providerName);
    
    if (!providerConfig.enabled) {
      throw new Error(`Provider '${providerName}' is not enabled`);
    }

    const modelConfig = providerConfig.models.structured;

    switch (providerName) {
      case 'openai':
        return new ChatOpenAI({
          model: modelConfig.name,
          apiKey: this.getProviderApiKey('openai'),
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
        });

      case 'gemini':
        return new ChatGoogleGenerativeAI({
          model: modelConfig.name,
          apiKey: this.getProviderApiKey('gemini'),
          temperature: modelConfig.temperature,
          maxOutputTokens: modelConfig.maxTokens,
        });

      case 'anthropic':
        return new ChatAnthropic({
          model: modelConfig.name,
          apiKey: this.getProviderApiKey('anthropic'),
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
        });

      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  /**
   * Build system prompt from configuration
   */
  buildSystemPrompt(mode: 'patient' | 'clinical', language: string, pageContext: any): string {
    const basePrompt = this.config.prompts.base.instruction;
    const modeConfig = this.config.prompts[mode];
    
    let systemPrompt = `${basePrompt}\n\n${modeConfig.systemPrompt.title}:\n`;
    
    // Add guidelines
    modeConfig.systemPrompt.guidelines.forEach(guideline => {
      systemPrompt += `- ${this.interpolateString(guideline, { language, profileName: pageContext?.profileName || 'Patient' })}\n`;
    });
    
    systemPrompt += '\n';
    
    // Add anatomy instructions
    modeConfig.systemPrompt.anatomyInstructions.forEach(instruction => {
      systemPrompt += `${instruction}\n`;
    });
    
    // Add document context if enabled
    if (this.config.documentContext.enabled) {
      const documentContext = this.buildDocumentContext(pageContext);
      if (documentContext) {
        systemPrompt += `\n${documentContext}`;
      }
    }
    
    systemPrompt += '\n';
    
    // Add mode-specific sections
    if (modeConfig.systemPrompt.boundaries) {
      systemPrompt += '\nIMPORTANT BOUNDARIES:\n';
      modeConfig.systemPrompt.boundaries.forEach(boundary => {
        systemPrompt += `- ${boundary}\n`;
      });
    }
    
    if (modeConfig.systemPrompt.focus) {
      systemPrompt += '\nCLINICAL FOCUS:\n';
      modeConfig.systemPrompt.focus.forEach(focus => {
        systemPrompt += `- ${focus}\n`;
      });
    }
    
    return systemPrompt;
  }

  /**
   * Create response schema from configuration
   */
  createResponseSchema(mode: 'patient' | 'clinical'): any {
    const schema = JSON.parse(JSON.stringify(this.config.responseSchema.base));
    
    // Add anatomy objects to enum
    const allAnatomyObjects: string[] = [];
    Object.values(anatomyObjects).forEach((system: any) => {
      allAnatomyObjects.push(...system.objects);
    });
    schema.parameters.properties.anatomyReferences.items.enum = allAnatomyObjects;
    
    // Add mode-specific properties
    const modeConfig = this.config.prompts[mode];
    Object.entries(modeConfig.responseSchema.additionalProperties).forEach(([key, value]) => {
      schema.parameters.properties[key] = value;
    });
    
    return schema;
  }

  /**
   * Get language name from code
   */
  getLanguageName(languageCode: string): string {
    return this.config.languages[languageCode] || this.config.languages['en'];
  }

  /**
   * Get conversation history configuration
   */
  getConversationConfig() {
    return this.config.conversationHistory;
  }

  /**
   * Private helper methods
   */
  private getProviderApiKey(provider: string): string {
    return modelConfig.getProviderApiKey(provider);
  }

  private interpolateString(template: string, variables: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  private buildDocumentContext(pageContext: any): string {
    if (!pageContext?.documentsContent || !Array.isArray(pageContext.documentsContent)) {
      return '';
    }

    const documents = pageContext.documentsContent.slice(0, this.config.documentContext.maxDocuments);
    if (documents.length === 0) {
      return '';
    }

    let documentContext = '\n\nAVAILABLE MEDICAL DOCUMENTS:\n';
    
    documents.forEach(([docId, doc]: [string, any]) => {
      if (doc?.content) {
        documentContext += `\nDocument: ${doc.content.title || doc.metadata?.title || 'Untitled'}\n`;
        
        // Include configured fields
        this.config.documentContext.includeFields.forEach(field => {
          if (doc.content[field]) {
            documentContext += `- ${field.charAt(0).toUpperCase() + field.slice(1)}: ${JSON.stringify(doc.content[field])}\n`;
          }
        });
        
        // Include additional content if enabled
        if (this.config.documentContext.includeAdditionalContent) {
          const excludeFields = ['title', ...this.config.documentContext.includeFields];
          const otherContent = Object.keys(doc.content)
            .filter(key => !excludeFields.includes(key))
            .reduce((obj, key) => {
              obj[key] = doc.content[key];
              return obj;
            }, {} as any);
            
          if (Object.keys(otherContent).length > 0) {
            documentContext += `- Additional Information: ${JSON.stringify(otherContent)}\n`;
          }
        }
      }
    });
    
    return documentContext;
  }
}

export const chatConfigManager = new ChatConfigManager();