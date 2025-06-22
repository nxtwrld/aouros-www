# AI Document Import - Error Handling Strategy

> **Navigation**: [← Roadmap](./AI_IMPORT_07_ROADMAP.md) | [README](./AI_IMPORT_README.md)


## Comprehensive Error Handling Strategy

### 1. LangGraph Error Handling Patterns

#### Node-Level Error Wrapper

```typescript
// src/lib/workflows/error-handling/node-wrapper.ts
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  nodeFunction: T,
  nodeName: string,
  options: {
    retryCount?: number;
    retryDelay?: number;
    fallbackValue?: any;
    criticalFailure?: boolean;
  } = {}
): T {
  return (async (...args: any[]) => {
    const state = args[0] as DocumentProcessingState;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= (options.retryCount || 0); attempt++) {
      try {
        if (attempt > 0) {
          console.warn(`Retrying ${nodeName}, attempt ${attempt + 1}`);
          await sleep(options.retryDelay || 1000 * attempt);
        }
        
        return await nodeFunction(...args);
      } catch (error) {
        lastError = error as Error;
        
        // Log error with context
        console.error(`Error in node ${nodeName}:`, {
          attempt: attempt + 1,
          error: error.message,
          state: { documentType: state.documentType, language: state.language }
        });
        
        // If this is the last attempt or a critical failure, break
        if (attempt >= (options.retryCount || 0) || options.criticalFailure) {
          break;
        }
      }
    }
    
    // Handle final failure
    const errorState = {
      ...state,
      errors: [...(state.errors || []), {
        node: nodeName,
        message: lastError?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        stack: lastError?.stack,
        attempts: (options.retryCount || 0) + 1,
        critical: options.criticalFailure || false
      }]
    };
    
    // Return fallback value or error state
    if (options.fallbackValue !== undefined) {
      return { ...errorState, ...options.fallbackValue };
    }
    
    return errorState;
  }) as T;
}
```

#### Circuit Breaker Pattern

```typescript
// src/lib/workflows/error-handling/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

### 2. Provider-Level Error Handling

#### Multi-Provider Fallback Chain

```typescript
// src/lib/workflows/providers/fallback-handler.ts
export class ProviderFallbackHandler {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  
  async executeWithFallback<T>(
    primaryProvider: AIProvider,
    fallbackProviders: AIProvider[],
    operation: (provider: AIProvider) => Promise<T>,
    context: { task: string; retries?: number }
  ): Promise<{ result: T; provider: string; attempts: number }> {
    const providers = [primaryProvider, ...fallbackProviders];
    let lastError: Error | null = null;
    
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const circuitBreaker = this.getCircuitBreaker(provider.name);
      
      try {
        const result = await circuitBreaker.execute(() => operation(provider));
        
        return {
          result,
          provider: provider.name,
          attempts: i + 1
        };
      } catch (error) {
        lastError = error as Error;
        
        console.warn(`Provider ${provider.name} failed for ${context.task}:`, error.message);
        
        // If this was the primary provider, emit SSE event about fallback
        if (i === 0) {
          this.emitFallbackEvent(provider.name, fallbackProviders[0]?.name, context.task);
        }
      }
    }
    
    throw new Error(`All providers failed for ${context.task}. Last error: ${lastError?.message}`);
  }
  
  private getCircuitBreaker(providerName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(providerName)) {
      this.circuitBreakers.set(providerName, new CircuitBreaker());
    }
    return this.circuitBreakers.get(providerName)!;
  }
  
  private emitFallbackEvent(primary: string, fallback: string, task: string) {
    // Emit SSE event about provider fallback
    // Implementation depends on SSE infrastructure
  }
}
```

### 3. Workflow-Level Error Recovery

#### Partial Success Handling

```typescript
// src/lib/workflows/error-handling/partial-success.ts
export function handlePartialSuccess(state: DocumentProcessingState): DocumentProcessingState {
  const { errors = [] } = state;
  
  // Categorize errors by severity
  const criticalErrors = errors.filter(e => e.critical);
  const recoverable = errors.filter(e => !e.critical);
  
  if (criticalErrors.length > 0) {
    // Critical failure - cannot proceed
    return {
      ...state,
      processingStatus: 'failed',
      failureReason: 'critical_errors',
      canRetry: false
    };
  }
  
  if (recoverable.length > 0) {
    // Partial success - some features failed but core processing succeeded
    return {
      ...state,
      processingStatus: 'partial_success',
      warnings: recoverable.map(e => e.message),
      canRetry: true,
      missingFeatures: recoverable.map(e => e.node)
    };
  }
  
  return {
    ...state,
    processingStatus: 'success'
  };
}
```

#### Graceful Degradation

```typescript
// src/lib/workflows/error-handling/graceful-degradation.ts
export const gracefulDegradationStrategies = {
  prescription_extraction: {
    fallback: 'manual_review_required',
    essentialFor: ['prescription'],
    canSkip: true
  },
  
  immunization_extraction: {
    fallback: 'manual_review_required', 
    essentialFor: ['immunization'],
    canSkip: true
  },
  
  medical_classification: {
    fallback: 'generic_medical_document',
    essentialFor: ['document_type', 'routing'],
    canSkip: false
  },
  
  laboratory_signals: {
    fallback: 'text_only_extraction',
    essentialFor: ['structured_lab_data'],
    canSkip: true
  }
};

export function applyGracefulDegradation(
  state: DocumentProcessingState,
  failedNode: string
): DocumentProcessingState {
  const strategy = gracefulDegradationStrategies[failedNode];
  
  if (!strategy) {
    return state; // No degradation strategy available
  }
  
  if (!strategy.canSkip) {
    // Essential node failure - cannot degrade
    return {
      ...state,
      processingStatus: 'failed',
      failureReason: `essential_node_failed: ${failedNode}`
    };
  }
  
  // Apply fallback strategy
  return {
    ...state,
    degradations: [...(state.degradations || []), {
      node: failedNode,
      strategy: strategy.fallback,
      affectedFeatures: strategy.essentialFor,
      timestamp: new Date().toISOString()
    }],
    warnings: [...(state.warnings || []), 
      `${failedNode} failed, using fallback: ${strategy.fallback}`
    ]
  };
}
```

### 4. User-Facing Error Communication

#### Error Classification and Messaging

```typescript
// src/lib/workflows/error-handling/user-messages.ts
export const errorMessages = {
  provider_timeout: {
    user: "Processing is taking longer than expected. We're trying an alternative approach.",
    technical: "AI provider timeout, attempting fallback",
    action: "automatic_retry"
  },
  
  invalid_medical_document: {
    user: "This doesn't appear to be a medical document. Please verify the file and try again.",
    technical: "Medical classification failed",
    action: "user_intervention"
  },
  
  schema_validation_failed: {
    user: "We couldn't extract all information from this document. Some data may need manual review.",
    technical: "Extracted data failed schema validation",
    action: "partial_success"
  },
  
  all_providers_failed: {
    user: "We're experiencing technical difficulties. Please try again in a few minutes.",
    technical: "All AI providers failed",
    action: "system_retry"
  }
};

export function getUserFriendlyError(error: ProcessingError): {
  message: string;
  action: string;
  canRetry: boolean;
} {
  const config = errorMessages[error.type] || {
    user: "An unexpected error occurred. Please try again.",
    action: "manual_retry"
  };
  
  return {
    message: config.user,
    action: config.action,
    canRetry: ['automatic_retry', 'system_retry', 'manual_retry'].includes(config.action)
  };
}
```

### 5. Implementation Priorities

#### Phase 1: Critical Fixes (Week 1)
- [x] **Schema race condition fix** - COMPLETED
- [ ] Basic error wrapping for all nodes
- [ ] Provider timeout handling
- [ ] Circuit breaker implementation

#### Phase 2: Resilience (Week 2)  
- [ ] Multi-provider fallback chains
- [ ] Graceful degradation strategies
- [ ] Partial success handling
- [ ] User-friendly error messages

#### Phase 3: Advanced Recovery (Week 3)
- [ ] Human-in-the-loop error recovery
- [ ] Automatic retry with exponential backoff
- [ ] Performance monitoring and alerting
- [ ] Error analytics and pattern detection

### 6. Success Metrics

- **Error Recovery Rate**: 95% of recoverable errors handled gracefully
- **User Experience**: 90% of errors have clear, actionable messaging
- **System Resilience**: 99.5% uptime with provider failures
- **Processing Continuity**: 85% of documents processed successfully even with partial failures

---

This comprehensive error handling strategy transforms the AI document import system from a fragile, single-point-of-failure system into a resilient, user-friendly platform that gracefully handles the inevitable complexities of AI provider integration and medical document processing.