# AI Session Analysis - Configuration System Extension

> **Navigation**: [← AI Import User Configuration](./AI_IMPORT_USER_CONFIGURATION.md) | [Session Analysis Overview](./AI_SESSION_ANALYSIS.md) | [Integration Summary](./AI_IMPORT_CONFIG_INTEGRATION_SUMMARY.md)

This document defines the **session analysis configuration extension** that builds upon the comprehensive AI_IMPORT configuration system, providing specialized real-time medical conversation analysis capabilities while maintaining complete alignment with the established configuration patterns.

## Configuration System Alignment

The session analysis configuration **extends** the AI_IMPORT system rather than replacing it:

```typescript
// Unified configuration resolution (shared resolver)
const resolvedConfig = ConfigurationResolver.resolve(
  {
    ...AI_IMPORT_SYSTEM_DEFAULTS, // Base AI workflow defaults
    ...SESSION_SYSTEM_EXTENSIONS, // Session-specific additions
  },
  {
    ...userConfiguration, // Existing user preferences
    ...sessionPreferences, // Session-specific user preferences
  },
  userRegion,
);
```

**Key Principle**: **Maximum Reuse** - Every component from AI_IMPORT is leveraged and extended, not duplicated.

## System Configuration Extensions

### Session-Specific System Defaults

```typescript
// src/lib/workflows/config/session-system-extensions.ts
export const SESSION_SYSTEM_EXTENSIONS: SessionSystemExtensions = {
  // Real-time processing extensions (builds on AI_IMPORT processing settings)
  realTimeProcessing: {
    // Extends existing processing.maxConcurrentRequests from AI_IMPORT
    maxConcurrentSessions: 50,
    sessionTimeout: 14400000, // 4 hours

    // Smart batching for live conversations
    analysisBuffering: {
      minContentLength: 100, // characters (inherited from AI_IMPORT patterns)
      maxWaitTime: 15000, // 15 seconds for real-time responsiveness
      batchOptimization: true,
      speakerChangeTriggered: true, // Session-specific: analyze on speaker changes
    },

    // Real-time quality gates (extends AI_IMPORT quality settings)
    realtimeQuality: {
      enableProgressiveAnalysis: true,
      allowPartialResults: true,
      minPartialConfidence: 0.6, // Lower than AI_IMPORT's conservative defaults for real-time
      maxAnalysisLatency: 30000, // 30 seconds max for any analysis step
    },
  },

  // Medical session workflow extensions (leverages AI_IMPORT medical configuration)
  medicalSession: {
    // Extends existing medical.defaultDatabases from AI_IMPORT
    sessionSpecificDatabases: {
      realTimeDrugInteractions: ["DRUGBANK", "RXNORM"], // Fast lookup databases
      liveDiagnosisValidation: ["SNOMED_INTL", "ICD10"],
      emergencyProtocols: ["WHO_EMERGENCY_CODES"],
    },

    // Session complexity configurations (extends AI_IMPORT schemas)
    complexityModes: {
      fast: {
        enabledSteps: ["transcript", "basic_analysis"],
        maxAnalysisTime: 15000,
        confidenceThreshold: 0.7,
        crossValidation: false,
      },
      standard: {
        enabledSteps: ["transcript", "diagnosis", "treatment", "medication"],
        maxAnalysisTime: 45000,
        confidenceThreshold: 0.8,
        crossValidation: true,
      },
      comprehensive: {
        enabledSteps: [
          "transcript",
          "diagnosis",
          "treatment",
          "medication",
          "followup",
          "clarifying_questions",
        ],
        maxAnalysisTime: 90000,
        confidenceThreshold: 0.85,
        crossValidation: true,
        externalValidation: true, // Uses AI_IMPORT MCP integration
      },
    },
  },

  // SSE integration extensions (builds on AI_IMPORT SSE infrastructure)
  streamingUpdates: {
    // Extends existing SSE configuration from AI_IMPORT
    sessionEvents: {
      analysisProgress: true,
      partialResults: true,
      speakerChanges: true,
      qualityAlerts: true,
      costWarnings: true, // Reuses AI_IMPORT budget tracking
    },

    // Performance optimization for real-time
    updateOptimization: {
      batchUpdates: true,
      compressionEnabled: true,
      adaptiveFrequency: true, // Adjust based on session activity
      maxUpdatesPerSecond: 10,
    },
  },
};
```

### Session Workflow Model Extensions

```typescript
// src/lib/workflows/config/session-model-extensions.ts
export const SESSION_WORKFLOW_MODEL_EXTENSIONS: SessionModelExtensions = {
  // Real-time transcript analysis (extends AI_IMPORT model configuration patterns)
  realtimeTranscriptAnalysis: {
    // Inherits from AI_IMPORT provider selection patterns
    primary: {
      provider: "openai",
      model: "gpt-4o-mini", // Fast model for real-time
      parameters: {
        temperature: 0.1, // Consistent with AI_IMPORT's low temperature for medical
        maxTokens: 1500, // Smaller for speed
        stream: true, // Session-specific: streaming support
      },
      timeout: 15000, // Faster than AI_IMPORT's 30s default
      retryAttempts: 1, // Fewer retries for real-time
    },

    // Reuses AI_IMPORT fallback patterns
    fallbacks: [
      {
        provider: "groq",
        model: "llama-3.1-70b-versatile", // Very fast inference
        parameters: { temperature: 0.1, maxTokens: 1500, stream: true },
      },
    ],

    // Session-specific requirements
    requirements: {
      supportsStreaming: true, // Session-specific
      maxResponseTime: 15000, // Tighter than AI_IMPORT
      minContextWindow: 8000,
      supportsVision: false, // Not needed for transcript analysis
    },

    // Extends AI_IMPORT quality settings with real-time considerations
    qualitySettings: {
      minConfidence: 0.7, // Lower than AI_IMPORT's 0.80 for speed
      enableRetryOnLowConfidence: false, // No retries in real-time
      enableCrossValidation: false, // Too slow for real-time
      enableProgressiveResults: true, // Session-specific
    },
  },

  // Incremental medical analysis (builds on AI_IMPORT medical analysis)
  incrementalMedicalAnalysis: {
    // Reuses AI_IMPORT's strong medical reasoning models
    primary: {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022", // Same as AI_IMPORT for medical accuracy
      parameters: {
        temperature: 0.2, // Same as AI_IMPORT medical analysis
        maxTokens: 4000,
      },
      timeout: 45000, // Same as AI_IMPORT
      retryAttempts: 2,
    },

    // Same fallback chain as AI_IMPORT medical analysis
    fallbacks: [
      {
        provider: "openai",
        model: "gpt-4o", // Same as AI_IMPORT
        parameters: { temperature: 0.2, maxTokens: 4000 },
      },
    ],

    // Extends AI_IMPORT quality with session context
    qualitySettings: {
      minConfidence: 0.85, // Same high standard as AI_IMPORT
      enableRetryOnLowConfidence: true, // Same as AI_IMPORT
      enableCrossValidation: true, // Same as AI_IMPORT
      requiresHumanReview: true, // Same safety standard
      // Session-specific addition
      enableIncrementalAnalysis: true,
      preservePreviousContext: true,
    },
  },
};
```

## User Configuration Extensions

### Session User Preferences (Extends UserConfiguration)

```typescript
// src/lib/workflows/session-analysis/config/user-extensions.interface.ts

// Extends the existing UserConfiguration from AI_IMPORT
export interface SessionUserConfiguration extends UserConfiguration {
  // All AI_IMPORT configuration inherited: regional, medical, aiPreferences, quality, etc.

  // Session-specific additions only
  session: SessionPreferences;
  realTime: RealTimePreferences;

  // Override: Extend medical configuration with session-specific settings
  medical: SessionMedicalConfiguration; // Extends MedicalConfiguration from AI_IMPORT
}

export interface SessionPreferences {
  // Session behavior settings
  autoAnalysis: {
    enabled: boolean;
    triggerOnSpeakerChange: boolean;
    triggerOnContentThreshold: number; // characters (100 default)
    triggerOnTimeThreshold: number; // milliseconds (15000 default)
    triggerOnFinalTranscript: boolean;
  };

  // Session management (builds on AI_IMPORT processing settings)
  management: {
    maxDuration: number; // milliseconds
    autoSave: boolean;
    autoSaveInterval: number; // milliseconds
    enableSpeakerDiarization: boolean;
    maxParticipants: number;
  };

  // Session complexity (maps to SESSION_SYSTEM_EXTENSIONS.medicalSession.complexityModes)
  analysisComplexity: "fast" | "standard" | "comprehensive";
}

export interface RealTimePreferences {
  // SSE preferences (extends AI_IMPORT SSE configuration)
  streaming: {
    enableRealTimeUpdates: boolean;
    updateFrequency: "adaptive" | "high" | "medium" | "low";
    enablePartialResults: boolean;
    enableProgressUpdates: boolean;
  };

  // Performance vs quality trade-offs
  performance: {
    prioritizeSpeed: boolean; // If true, use faster models
    allowLowerConfidence: boolean; // If true, lower thresholds for speed
    enableProgressiveAnalysis: boolean; // Build analysis incrementally
  };

  // User experience preferences
  userExperience: {
    showProcessingSteps: boolean;
    enableNotifications: boolean;
    showConfidenceScores: boolean;
    enableDebugMode: boolean;
  };
}

// Extends MedicalConfiguration from AI_IMPORT with session-specific additions
export interface SessionMedicalConfiguration extends MedicalConfiguration {
  // All AI_IMPORT medical configuration inherited: databases, patientContext, specialties, etc.

  // Session-specific medical additions
  sessionMedical: {
    // Enabled analysis components (maps to complexityModes)
    enabledAnalysis: {
      transcript: boolean;
      diagnosis: boolean;
      treatment: boolean;
      medication: boolean;
      followUp: boolean;
      clarifyingQuestions: boolean;
    };

    // Real-time medical validation (uses AI_IMPORT external tools)
    realTimeValidation: {
      enableMedicationChecking: boolean; // Uses AI_IMPORT MCP medication tools
      enableDiagnosisValidation: boolean; // Uses AI_IMPORT MCP diagnosis tools
      enableInteractionWarnings: boolean; // Real-time drug interaction alerts
    };

    // Emergency protocols
    emergencyDetection: {
      enabled: boolean;
      keywordTriggers: string[]; // Words that trigger emergency protocols
      confidenceThreshold: number; // Confidence for emergency escalation
      autoAlert: boolean; // Automatically alert providers
    };
  };
}
```

## Configuration Integration Patterns

### Shared Configuration Resolver Extension

```typescript
// src/lib/workflows/config/session-configuration-resolver.ts

export class SessionConfigurationResolver extends ConfigurationResolver {
  // Extends the base ConfigurationResolver from AI_IMPORT
  static resolveSession(
    baseSystemConfig: SystemConfiguration, // From AI_IMPORT
    sessionSystemExtensions: SessionSystemExtensions,
    userConfig: SessionUserConfiguration,
    region?: RegionCode,
  ): ResolvedSessionConfiguration {
    // Step 1: Resolve base configuration using AI_IMPORT resolver
    const baseResolved = super.resolve(baseSystemConfig, userConfig, region);

    // Step 2: Apply session-specific extensions
    const sessionResolved = this.mergeSessionExtensions(
      baseResolved,
      sessionSystemExtensions,
    );

    // Step 3: Apply session-specific user preferences
    const finalResolved = this.applySessionUserPreferences(
      sessionResolved,
      userConfig,
    );

    // Step 4: Validate session-specific configuration
    this.validateSessionConfiguration(finalResolved);

    return finalResolved;
  }

  private static mergeSessionExtensions(
    baseConfig: ResolvedConfiguration,
    sessionExtensions: SessionSystemExtensions,
  ): Partial<ResolvedSessionConfiguration> {
    return {
      ...baseConfig,

      // Extend AI_IMPORT models with session-specific models
      models: {
        ...baseConfig.models,
        realtimeTranscriptAnalysis:
          sessionExtensions.realtimeTranscriptAnalysis,
        incrementalMedicalAnalysis:
          sessionExtensions.incrementalMedicalAnalysis,
      },

      // Extend AI_IMPORT processing with real-time settings
      processing: {
        ...baseConfig.processing,
        realTimeProcessing: sessionExtensions.realTimeProcessing,
        streamingUpdates: sessionExtensions.streamingUpdates,
      },

      // Extend AI_IMPORT medical with session-specific medical settings
      medical: {
        ...baseConfig.medical,
        sessionSpecificDatabases:
          sessionExtensions.medicalSession.sessionSpecificDatabases,
        complexityModes: sessionExtensions.medicalSession.complexityModes,
      },
    };
  }

  private static applySessionUserPreferences(
    baseConfig: Partial<ResolvedSessionConfiguration>,
    userConfig: SessionUserConfiguration,
  ): ResolvedSessionConfiguration {
    // Apply user's session preferences
    const selectedComplexity = userConfig.session.analysisComplexity;
    const complexitySettings =
      baseConfig.medical.complexityModes[selectedComplexity];

    // Apply user's real-time preferences to model selection
    const modelOverrides = this.getModelOverridesForRealTimePrefs(
      userConfig.realTime,
    );

    return {
      ...baseConfig,

      // Active configuration based on user complexity choice
      activeComplexity: complexitySettings,

      // Model selection influenced by real-time preferences
      models: this.applyModelOverrides(baseConfig.models, modelOverrides),

      // Processing settings influenced by real-time preferences
      processing: this.applyRealTimeProcessingPrefs(
        baseConfig.processing,
        userConfig.realTime,
      ),

      // Quality thresholds adjusted for real-time if user prioritizes speed
      quality: this.adjustQualityForRealTime(
        baseConfig.quality,
        userConfig.realTime,
      ),
    } as ResolvedSessionConfiguration;
  }
}
```

### Session Configuration Factory (Extends AI_IMPORT Factory)

```typescript
// src/lib/workflows/session-analysis/config/session-configuration-factory.ts

export class SessionConfigurationFactory extends UserConfigurationFactory {
  // Extends AI_IMPORT factory with session-specific factory methods
  static createSessionDefault(userId: string): SessionUserConfiguration {
    // Start with AI_IMPORT default configuration
    const baseConfig = super.createDefault(userId);

    // Add session-specific defaults
    return {
      ...baseConfig,

      // Session-specific additions
      session: this.getDefaultSessionPreferences(),
      realTime: this.getDefaultRealTimePreferences(),

      // Override medical configuration with session extensions
      medical: {
        ...baseConfig.medical,
        sessionMedical: this.getDefaultSessionMedicalConfig(),
      },
    };
  }

  static forSessionSpecialty(
    userId: string,
    specialty: MedicalSpecialty,
    region: RegionCode = "GLOBAL",
  ): SessionUserConfiguration {
    // Start with AI_IMPORT regional configuration
    const baseConfig = super.forRegion(userId, region);

    // Apply session-specific specialty optimizations
    const sessionConfig = this.createSessionDefault(userId);

    switch (specialty) {
      case "GP":
        return this.applyGPSessionDefaults(sessionConfig, region);
      case "PT":
        return this.applyPTSessionDefaults(sessionConfig, region);
      case "CARDIO":
        return this.applyCardiologySessionDefaults(sessionConfig, region);
      default:
        return { ...baseConfig, ...sessionConfig };
    }
  }

  static forRealTimeOptimization(
    userId: string,
    region: RegionCode = "GLOBAL",
  ): SessionUserConfiguration {
    // Start with cost-optimized configuration from AI_IMPORT
    const baseConfig = ConfigurationFactory.createCostOptimized(userId, region);

    // Apply real-time specific optimizations
    return {
      ...baseConfig,

      session: {
        ...this.getDefaultSessionPreferences(),
        analysisComplexity: "fast", // Use fastest complexity mode
        autoAnalysis: {
          enabled: true,
          triggerOnSpeakerChange: true,
          triggerOnContentThreshold: 50, // Lower threshold for faster response
          triggerOnTimeThreshold: 10000, // 10 seconds instead of 15
          triggerOnFinalTranscript: true,
        },
      },

      realTime: {
        streaming: {
          enableRealTimeUpdates: true,
          updateFrequency: "high",
          enablePartialResults: true,
          enableProgressUpdates: true,
        },
        performance: {
          prioritizeSpeed: true,
          allowLowerConfidence: true,
          enableProgressiveAnalysis: true,
        },
        userExperience: {
          showProcessingSteps: false, // Reduce visual noise
          enableNotifications: true,
          showConfidenceScores: false, // Hide for cleaner UX
          enableDebugMode: false,
        },
      },

      // Use AI_IMPORT's cost-optimized models but with streaming enabled
      aiPreferences: {
        ...baseConfig.aiPreferences,
        optimizationStrategy: "speed",
        // Override with session-optimized provider preferences
        providerPreferences: {
          vision: ["groq", "openai"], // Fast providers first
          textProcessing: ["groq", "openai"], // Fast providers first
          structuredExtraction: ["openai", "groq"],
        },
      },
    };
  }

  private static applyGPSessionDefaults(
    config: SessionUserConfiguration,
    region: RegionCode,
  ): SessionUserConfiguration {
    return {
      ...config,

      session: {
        ...config.session,
        analysisComplexity: "comprehensive", // GPs need full analysis
        autoAnalysis: {
          ...config.session.autoAnalysis,
          triggerOnSpeakerChange: true, // Important for doctor-patient dialogue
          triggerOnContentThreshold: 100, // Standard threshold
          triggerOnTimeThreshold: 15000, // Standard timing
        },
      },

      medical: {
        ...config.medical,
        sessionMedical: {
          ...config.medical.sessionMedical,
          enabledAnalysis: {
            transcript: true,
            diagnosis: true,
            treatment: true,
            medication: true,
            followUp: true,
            clarifyingQuestions: true, // Important for GP consultations
          },
          realTimeValidation: {
            enableMedicationChecking: true, // Critical for GPs
            enableDiagnosisValidation: true,
            enableInteractionWarnings: true,
          },
        },
      },
    };
  }
}
```

## Integration with Existing AI_IMPORT Infrastructure

### Shared Provider Registry Extension

```typescript
// Extends existing src/lib/workflows/providers/registry.ts

export class SessionProviderRegistry extends ProviderRegistry {
  // Add session-specific provider capabilities
  static registerSessionCapabilities() {
    // Extend existing providers with session-specific capabilities
    this.updateProviderCapabilities("openai", {
      ...this.getProviderCapabilities("openai"),
      supportsStreaming: true,
      supportsRealTime: true,
      maxStreamingLatency: 2000,
    });

    this.updateProviderCapabilities("groq", {
      ...this.getProviderCapabilities("groq"),
      supportsStreaming: true,
      supportsRealTime: true,
      maxStreamingLatency: 1000, // Very fast
    });
  }

  // Session-specific provider selection
  static selectForSessionTask(
    task: SessionAnalysisTask,
    requirements: SessionTaskRequirements,
    userPreferences: SessionUserConfiguration,
  ): ProviderConfig {
    // If user prioritizes speed, prefer fast providers
    if (userPreferences.realTime.performance.prioritizeSpeed) {
      const fastProviders = this.getProvidersByCapability(
        "supportsRealTime",
        true,
      ).sort((a, b) => a.maxStreamingLatency - b.maxStreamingLatency);

      return this.selectFromProviders(fastProviders, task, requirements);
    }

    // Otherwise, use standard AI_IMPORT provider selection logic
    return super.selectOptimalProvider(
      task,
      requirements,
      userPreferences.aiPreferences,
    );
  }
}
```

### Shared MCP Integration Extension

```typescript
// Extends existing AI_IMPORT MCP integration for real-time session validation

export class SessionMCPIntegration extends MCPIntegration {
  // Real-time medication validation during session
  static async validateMedicationRealTime(
    medication: string,
    userConfig: SessionUserConfiguration,
    patientContext?: PatientContext,
  ): Promise<RealTimeMedicationValidation> {
    // Use existing AI_IMPORT MCP medication validation
    const baseValidation = await super.validateMedication(
      medication,
      userConfig.medical.databases.medication,
      patientContext,
    );

    // Add real-time specific enhancements
    return {
      ...baseValidation,

      // Real-time specific additions
      validationSpeed: "realtime",
      cacheHit: this.checkValidationCache(medication),

      // Use session-specific confidence thresholds
      meetsSessionThreshold:
        baseValidation.confidence >=
        userConfig.quality.confidenceThresholds.autoAccept.medication,

      // Real-time interaction warnings
      interactionWarnings: userConfig.medical.sessionMedical.realTimeValidation
        .enableInteractionWarnings
        ? await this.checkRealTimeInteractions(medication, patientContext)
        : [],
    };
  }

  // Fast diagnosis code validation for live sessions
  static async validateDiagnosisCodeRealTime(
    diagnosisText: string,
    userConfig: SessionUserConfiguration,
  ): Promise<RealTimeDiagnosisValidation> {
    // Use existing AI_IMPORT diagnosis validation but with session timeouts
    const baseValidation = await super.validateDiagnosisCode(
      diagnosisText,
      userConfig.regional.primaryRegion,
      { timeout: 10000 }, // Faster timeout for real-time
    );

    return {
      ...baseValidation,
      validationType: "realtime",
      sessionCompliant: true,
    };
  }
}
```

## Summary: Maximum Reuse Strategy

### What We're Reusing from AI_IMPORT:

1. **Configuration Architecture**: Two-layer system, resolver patterns, factory methods
2. **Provider System**: Entire provider abstraction, selection logic, fallback chains
3. **External Tools**: MCP integration, regional databases, validation logic
4. **Quality Framework**: Confidence thresholds, human review, validation patterns
5. **Monitoring**: LangSmith integration, performance metrics, cost tracking
6. **Regional Defaults**: Language preferences, medical standards, compliance requirements

### What We're Adding for Sessions:

1. **Real-time Processing**: Streaming, progressive analysis, low-latency requirements
2. **Session Management**: Duration limits, participant tracking, auto-save
3. **Incremental Analysis**: Building analysis as conversation progresses
4. **Emergency Detection**: Real-time alerting for critical medical situations
5. **Speaker Diarization**: Multi-participant conversation analysis

### Integration Benefits:

- **Unified User Experience**: Same configuration interface across all AI features
- **Shared Infrastructure**: Reduce development and maintenance overhead
- **Consistent Quality**: Same high standards across document import and session analysis
- **Cost Optimization**: Shared provider budgeting and cost tracking
- **Regional Compliance**: Consistent medical standards and privacy requirements

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "config_analysis", "content": "Analyze existing session analysis configuration patterns to understand current state", "status": "completed", "priority": "high"}, {"id": "config_design", "content": "Design AI session analysis configuration system with System and User levels", "status": "completed", "priority": "high"}, {"id": "config_implementation", "content": "Create configuration interfaces and factory patterns for session analysis", "status": "completed", "priority": "high"}, {"id": "workflow_integration", "content": "Integrate configuration system with session analysis workflow patterns", "status": "in_progress", "priority": "medium"}, {"id": "documentation", "content": "Document the session analysis configuration system following import patterns", "status": "completed", "priority": "medium"}]
