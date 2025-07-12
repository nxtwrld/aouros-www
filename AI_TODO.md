# AI Import Modernization - TODO List

> **Current Status**: 80-85% Complete | **Architecture**: ✅ Fully Implemented | **Performance**: ✅ Mostly Complete | **UX**: ❌ Missing SSE

Based on comparison with `AI_IMPORT_02_MODERNIZATION_STRATEGY.md`, this document outlines the remaining tasks to complete our LangGraph-based modernization.

**Architecture Decision**: Maintaining two-endpoint approach for optimal performance:

- `/v1/import/extract` (+ `/stream`) - Fast OCR/text extraction with cheaper models
- `/v1/import/report` (+ `/stream`) - Deep medical analysis with LangGraph workflow

## 🚀 **PHASE 1: Performance & User Experience (Weeks 1-2)**

### **1.1 SSE Integration for Real-time Progress**

_Priority: HIGH | Impact: User Experience_

- [ ] **Implement SSE endpoints** for both extraction and analysis
  - Create `/src/routes/v1/import/extract/stream/+server.ts` for real-time OCR/extraction progress
  - Create `/src/routes/v1/import/report/stream/+server.ts` for real-time analysis progress
  - Keep existing endpoints for backwards compatibility
  - Add SSE response headers and streaming capabilities to both
- [ ] **Connect LangGraph workflow to import process**
  - Connect LangGraph to `/v1/import/report/stream` for medical analysis
  - Keep existing `assess()` in `/v1/import/extract` for OCR/pre-assessment
  - Modify `document-processing.ts` to emit progress after each node
  - Add progress tracking to `DocumentProcessingState`
- [ ] **Add progress events** to all workflow nodes:

  - `input-validation.ts` - Document received and validated
  - `document-type-router.ts` - Document type detected
  - `feature-detection.ts` - Features analyzed
  - `medical-analysis.ts` - Medical content extracted
  - `signal-processing.ts` - Signals processed and enhanced
  - `quality-gate.ts` - Final validation complete

- [ ] **Frontend SSE integration** in document upload components
  - Update upload UI to show real-time progress for both extraction and analysis
  - Add two-stage progress indicators:
    - Stage 1: OCR/Extraction progress from `/extract/stream`
    - Stage 2: Medical analysis progress from `/report/stream`
  - Maintain backwards compatibility with existing endpoints

### **1.2 Multi-Image Processing Architecture (Pre-LangGraph)**

_Priority: HIGH | Impact: Data Completeness_

> **Key Insight**: Decision logic should happen in `assess()` function in `assessInputs.ts`, not at API level
> **Flow**: `/v1/import/extract` → `assess()` → image type detection → route to appropriate processing
> **CRITICAL**: Must preserve document splitting functionality - multi-page documents split into individual documents
> **CLARIFICATION**: `assess()` already processes ALL images (`input.images.map()`), but AI analysis quality for multi-page extraction needs improvement

- [ ] **Implement image type detection and routing in `assess()` function**
  - Add `analyzeImageTypes()` function in `assessInputs.ts` (before line 56)
  - Detect document types: `text_document` vs `medical_imagery` vs `mixed`
  - Route to appropriate processing pathway before GPT API call
- [ ] **Phase 1: Enhanced Multi-Image Text Processing**
  - **Trigger**: Documents with text content (lab reports, clinical notes, prescriptions)
  - **Current Issue**: AI analyzes all images but may not properly extract text from each page individually
  - **Implementation**: Enhance `assess()` function to improve per-page text extraction quality
  - Process multiple images with better page-by-page analysis
  - Preserve existing GPT-4o/Gemini vision approach
  - **PRESERVE**: Document splitting logic - identify multiple documents within pages
  - **PRESERVE**: `Assessment` interface with `pages[]` and `documents[]` arrays
  - Maintain existing `Assessment` interface for backward compatibility
- [ ] **Phase 2: Direct Medical Image Analysis Pathway**

  - **Trigger**: Images identified as medical imagery (DICOM, X-rays, pathology)
  - **Implementation**: Create `handleDirectMedicalImageAnalysis()` function
  - Bypass text extraction, route directly to specialized medical image analysis
  - **PRESERVE**: Document splitting for medical images (e.g., multiple DICOM series)
  - Return results in same `Assessment` format to maintain API contract

- [ ] **Document Splitting Feature Preservation**

  - **Critical Feature**: Current `assess()` function intelligently splits multi-page uploads into separate documents
  - **Current Logic**: Uses AI to determine if pages belong to same document or multiple documents
  - **Schema**: `documents[]` array maps document titles to their constituent `pages[]`
  - **Examples**:
    - Multi-page lab report → Single document with pages [1,2]
    - Mixed upload (prescription + lab report) → Two documents with pages [1] and [2]
  - **Requirement**: Both Phase 1 and Phase 2 implementations must preserve this logic

- [ ] **Multi-Language Support Preservation**
  - **Critical Feature**: System supports documents in multiple languages with user-selected normalization
  - **Current Capabilities**:
    - **Language Detection**: AI-based detection with fallback to English
    - **Schema Localization**: All medical schemas support `[LANGUAGE]` placeholders
    - **Dual Content Storage**: Original content + localized content preservation
    - **User Language Selection**: EN/CS/DE support with URL routing
  - **Examples**:
    - German lab report → German original + English normalized version
    - Czech prescription → Czech original + User's selected language
  - **Requirement**: Both processing phases must preserve original content AND provide normalized versions

## 🔧 **PHASE 2: Optimization & Caching (Weeks 3-4)**

### **2.1 Provider Response Caching**

_Priority: MEDIUM | Impact: Cost Reduction_

- [ ] **Implement content hash caching**
  - Create `src/lib/cache/provider-cache.ts`
  - Add content fingerprinting for similar documents
  - Implement cache invalidation strategy
- [ ] **Add caching to workflow nodes**
  - Modify `medical-analysis.ts` to check cache before AI calls
  - Update `signal-processing.ts` to cache signal resolutions
  - Add cache statistics to quality gate

### **2.2 Content Deduplication**

_Priority: MEDIUM | Impact: Performance_

- [ ] **Document similarity detection**

  - Implement content fingerprinting algorithm
  - Add duplicate detection before processing
  - Create deduplication bypass mechanism

- [ ] **Shared processing results**
  - Cache and reuse analysis results for similar documents
  - Implement result sharing across user sessions (privacy-compliant)

### **2.3 Specialized Medical Image Analysis (Phase 2)**

_Priority: MEDIUM | Impact: Enhanced Capabilities_

> **Enhancement**: Add direct medical image analysis for non-text medical images
> **Approach**: Extend current text-first pattern with specialized medical image processing

- [ ] **DICOM Image Processing**
  - Add DICOM metadata extraction and parsing
  - Implement DICOM header analysis for imaging findings
  - Create DICOM-specific workflow nodes
  - **PRESERVE**: Multi-language support for DICOM metadata and findings
- [ ] **Medical Image Analysis**
  - Add X-ray analysis for radiological findings
  - Implement pathology image analysis capabilities
  - Create medical image classification (X-ray, MRI, CT, pathology)
  - **PRESERVE**: Language-aware medical image interpretation
- [ ] **Multi-Modal Processing**
  - Combine text extraction with direct image analysis
  - Implement confidence scoring for image vs text analysis
  - Add specialized medical image understanding for complex cases
  - **PRESERVE**: Original + localized content for image analysis results

### **2.4 Multi-Language Enhancement**

_Priority: CRITICAL | Impact: User Experience_

> **Enhancement**: Improve current multi-language capabilities
> **Current**: EN/CS/DE support with manual language specification

- [ ] **Enhanced Language Detection**
  - Add automatic language detection from document content
  - Implement language confidence scoring
  - Add mixed-language document support
- [ ] **Expanded Language Support**
  - Add support for additional medical document languages
  - Complete Czech and German UI translations
  - Implement language-specific medical terminology handling
- [ ] **OCR Language Detection**
  - Add automatic language detection during image OCR
  - Implement language-specific OCR optimization
  - Add right-to-left language support if needed

## 🔌 **PHASE 3: External Integrations (Weeks 5-6)**

### **3.1 MCP Integration for External Validation**

_Priority: HIGH | Impact: Accuracy_

- [ ] **Implement MCP client** in `src/lib/mcp/`
  - Add MCP server connection management
  - Implement medical database lookup tools
  - Add FHIR validation capabilities
- [ ] **Update `external-validation.ts` node**
  - Remove hardcoded skip logic in `shouldValidateExternally()` function at `document-processing.ts:32`
  - Add MCP-based signal validation
  - Implement confidence scoring from external sources
- [ ] **Add medical database validation**
  - Drug interaction checking
  - Lab value reference range validation
  - Diagnosis code verification

### **3.2 Enhanced Cross-Validation**

_Priority: MEDIUM | Impact: Accuracy_

- [ ] **Leverage schema cross-linking** for validation
  - Use embedded core schemas for consistency checking
  - Implement cross-section validation logic
  - Add relationship validation between sections

## 📊 **PHASE 4: Monitoring & Analytics (Weeks 7-8)**

### **4.1 ACI Score Monitoring & Improvement**

_Priority: CRITICAL | Impact: User Trust_

> **ACI Formula**: ACI = Value / (Risk × Correction Effort)
> **Goal**: Maintain high ACI score to avoid user frustration and ensure reliable medical document processing

- [ ] **ACI Metrics Implementation**
  - **Value Measurement**: Processing time savings, accuracy improvements, multi-language support
  - **Risk Assessment**: Data accuracy confidence, processing failures, medical data integrity
  - **Correction Effort Tracking**: User manual corrections, re-processing requests, error recovery time
  - Create ACI dashboard with real-time scoring
- [ ] **ACI Score Components**

  - **Value Metrics**:
    - Processing speed improvement (60-70% target)
    - Token cost reduction (40-55% target)
    - Multi-language accuracy (95%+ target)
    - User satisfaction scores
  - **Risk Metrics**:
    - Processing failure rate (<1% target)
    - Medical data accuracy confidence (>95% target)
    - Cross-validation consistency (>90% target)
    - Provider fallback incidents
  - **Correction Effort Metrics**:
    - User manual corrections per document
    - Re-processing requests frequency
    - Time to resolve processing errors
    - Support ticket volume related to import issues

- [ ] **ACI Monitoring Infrastructure**
  - Real-time ACI score calculation and alerting
  - ACI trend analysis and regression detection
  - Component-level ACI breakdown (OCR, analysis, validation)
  - User feedback integration for ACI calibration

### **4.2 LangSmith Integration**

_Priority: HIGH | Impact: Observability_

- [ ] **Configure LangSmith tracing**
  - Add LangSmith API key configuration
  - Enable workflow tracing for all nodes
  - Add custom metadata to traces
  - **ACI Integration**: Include ACI component metrics in traces
- [ ] **Implement performance metrics**
  - Track processing time per node
  - Monitor token usage across providers
  - Add accuracy metrics from validation results
  - **ACI Correlation**: Link performance metrics to ACI score components

### **4.3 Comprehensive Monitoring**

_Priority: MEDIUM | Impact: Reliability_

- [ ] **Add health checks** for all workflow components
  - Provider availability checks
  - MCP connection health
  - Cache performance metrics
  - **ACI Integration**: Include component health in ACI risk assessment
- [ ] **Implement alerting** for performance degradation
  - Processing time thresholds
  - Error rate monitoring
  - Provider fallback alerts
  - **ACI Alerts**: Trigger alerts when ACI score drops below threshold (e.g., <0.8)

## 🧪 **PHASE 5: Testing & Validation (Weeks 9-10)**

### **5.1 Step-by-Step Testing Strategy**

_Priority: HIGH | Impact: Development Efficiency_

> **Reference**: See `AI_TESTING.md` for complete testing strategy and implementation details
> **Approach**: File-based checkpointing + Selective step execution + LangSmith integration

- [ ] **Implement File-Based Testing Infrastructure**
  - **Test Runner**: Create `StepByStepTestRunner` class for scenario management
  - **Checkpoint System**: File-based checkpoint storage with JSON format
  - **Scenario Management**: Repository-based test scenarios for different document types
  - **Result Comparison**: Automated comparison between baseline and test results
  - **Internal Testing Endpoint**: Create `/v1/testing` API for step-by-step debugging
  - **Testing UI Dashboard**: Create `/testing` route with comprehensive testing interface
- [ ] **Create Test Scenario Library**
  - **Document Types**: Lab reports, imaging, pathology, prescriptions
  - **Languages**: Czech, German, English test scenarios
  - **Complexity Levels**: Simple, multi-page, multi-document scenarios
  - **Edge Cases**: Corrupted documents, mixed languages, unusual formats
- [ ] **LangSmith Integration**
  - **Trace Correlation**: Link file-based results to LangSmith traces
  - **Evaluation Metrics**: Custom evaluators for each workflow step
  - **Prompt Versioning**: Track prompt iterations through LangSmith
  - **Performance Monitoring**: Monitor step-by-step performance improvements
- [ ] **Rapid Iteration Interface**
  - **Web UI**: Navigate to `/testing` for comprehensive testing dashboard
  - **Document Upload**: Drag-and-drop interface with auto-scenario generation
  - **Step Debugging**: Visual step-by-step debugging with input/output inspection
  - **Result Comparison**: Side-by-side comparison with performance metrics
  - **API Testing**: `POST /v1/testing?action=run-step` for programmatic access
  - **CLI Alternative**: `npm run test:step lab-001-basic medical-analysis`

### **5.2 Performance Testing**

_Priority: HIGH | Impact: Reliability_

- [ ] **Load testing** with medical document datasets
  - Test concurrent processing capabilities
  - Validate SSE performance under load
  - Measure actual vs projected performance improvements
  - **ACI Validation**: Test ACI score stability under load
- [ ] **Accuracy validation** with known medical documents
  - Compare enhanced vs basic signal processing
  - Validate cross-validation improvements
  - Test MCP integration accuracy
  - **ACI Baseline**: Establish baseline ACI scores for different document types

### **5.3 Integration Testing**

_Priority: HIGH | Impact: Reliability_

- [ ] **End-to-end workflow testing**
  - Test all document types through complete workflow
  - Validate error handling and recovery
  - Test provider fallback scenarios
- [ ] **Regression testing** against current system
  - Ensure backward compatibility
  - Validate API contract compliance
  - Test migration rollback procedures

## 🚀 **PHASE 6: Production Deployment (Weeks 11-12)**

### **6.1 Gradual Rollout**

_Priority: HIGH | Impact: Risk Management_

- [ ] **Feature flag implementation**
  - Add feature flags for each modernization component
  - Implement gradual rollout strategy
  - Add fallback to current system
- [ ] **Production monitoring**
  - Deploy with comprehensive monitoring
  - Set up alerting for performance regressions
  - Monitor user experience metrics

### **6.2 Documentation & Training**

_Priority: MEDIUM | Impact: Team Adoption_

- [ ] **Update technical documentation**
  - Document new workflow architecture
  - Add troubleshooting guides
  - Create deployment procedures
- [ ] **Team training** on new architecture
  - LangGraph workflow concepts
  - Provider abstraction patterns
  - Monitoring and debugging procedures

## 📈 **SUCCESS METRICS**

### **Performance Targets (from AI_IMPORT_02_MODERNIZATION_STRATEGY.md)**

- **Processing Time**: 3-8 seconds (from 10-25 seconds) - 60-70% improvement
- **Token Costs**: $0.08-0.18/document (from $0.15-0.40) - 40-55% reduction
- **Concurrent Requests**: 50-100 (from 5-10) - 5-10x increase
- **Accuracy**: 92-97% (from 85-92%) - 7-12% improvement
- **Uptime**: 99.5% (from 95%) with multi-provider fallbacks

### **Completion Criteria**

- [ ] **All phases completed** with performance targets met
- [ ] **SSE integration** providing real-time progress updates
- [ ] **Multi-image text processing** handling all images in document (Phase 1)
- [ ] **Specialized medical image analysis** for DICOM/X-ray processing (Phase 2)
- [ ] **Multi-language support preservation** maintaining original + localized content
- [ ] **MCP integration** providing external validation
- [ ] **Comprehensive monitoring** with LangSmith integration
- [ ] **ACI score monitoring** maintaining >0.8 threshold for user satisfaction
- [ ] **Production deployment** with gradual rollout complete

---

> **Next Steps**: Begin with Phase 1 (SSE Integration) to provide immediate user experience improvements while maintaining current system stability.
