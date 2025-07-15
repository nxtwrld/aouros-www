#!/usr/bin/env node

/**
 * Workflow Recording Debugger
 * 
 * This tool helps debug workflow recordings to understand why structured data
 * isn't making it to the final result.
 */

import fs from 'fs';
import path from 'path';

function analyzeWorkflowRecording(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const recording = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log("🔍 WORKFLOW RECORDING ANALYSIS");
  console.log("=".repeat(50));
  
  // Basic info
  console.log(`📋 Recording ID: ${recording.recordingId}`);
  console.log(`⏰ Timestamp: ${recording.timestamp}`);
  console.log(`🏗️ Phase: ${recording.phase}`);
  console.log(`⏱️ Total Duration: ${recording.totalDuration}ms`);
  console.log(`🎯 Total Tokens: ${recording.totalTokenUsage?.total || 0}`);
  console.log("");

  // Input analysis
  console.log("📥 INPUT ANALYSIS:");
  console.log(`- Workflow Type: ${recording.input?.workflowType || 'unknown'}`);
  console.log(`- Text Length: ${recording.input?.inputs?.text?.length || 0} chars`);
  console.log(`- Language: ${recording.input?.inputs?.language || 'unknown'}`);
  console.log("");

  // Step analysis
  console.log("🔄 STEP ANALYSIS:");
  recording.steps?.forEach((step, index) => {
    console.log(`${index + 1}. ${step.stepName} (${step.duration}ms)`);
    
    // Check for key outputs
    const outputState = step.outputState || {};
    
    if (step.stepName === 'feature_detection') {
      console.log(`   ✓ Feature Detection Results:`, {
        isMedical: outputState.featureDetectionResults?.isMedical,
        hasPrescriptions: outputState.featureDetectionResults?.hasPrescriptions,
        hasProcedures: outputState.featureDetectionResults?.hasProcedures,
        hasSignals: outputState.featureDetectionResults?.hasSignals,
        hasDiagnosis: outputState.featureDetectionResults?.hasDiagnosis
      });
    }
    
    if (step.stepName === 'multi_node_processing') {
      console.log(`   🎯 Multi-Node Results:`, {
        processedNodes: outputState.multiNodeResults?.processedNodes || [],
        hasReport: !!outputState.report,
        reportType: typeof outputState.report,
        hasStructuredData: !!(outputState.report && typeof outputState.report === 'object' && !Array.isArray(outputState.report))
      });
      
      // Analyze structured sections
      const structuredSections = Object.keys(outputState).filter(key => 
        ['medical-analysis', 'prescription', 'procedures', 'signals', 'imaging'].includes(key)
      );
      
      if (structuredSections.length > 0) {
        console.log(`   📊 Structured Sections Found:`, structuredSections);
        structuredSections.forEach(section => {
          const data = outputState[section];
          console.log(`     - ${section}:`, {
            type: typeof data,
            keys: data && typeof data === 'object' ? Object.keys(data).slice(0, 5) : [],
            hasData: !!(data && Object.keys(data || {}).length > 1)
          });
        });
      }
    }
    
    if (step.errors?.length > 0) {
      console.log(`   ❌ Errors: ${step.errors.join(', ')}`);
    }
  });
  
  console.log("");

  // Final result analysis
  console.log("📤 FINAL RESULT ANALYSIS:");
  const finalStep = recording.steps?.[recording.steps.length - 1];
  const finalState = finalStep?.outputState || {};
  
  console.log("Final State Keys:", Object.keys(finalState).filter(k => 
    !['images', 'text', 'language', 'content', 'tokenUsage', 'errors', 'progressCallback', 'emitProgress', 'emitComplete', 'emitError'].includes(k)
  ));
  
  // Check if report is structured
  if (finalState.report) {
    console.log("Report Structure:", {
      type: typeof finalState.report,
      isArray: Array.isArray(finalState.report),
      keys: finalState.report && typeof finalState.report === 'object' && !Array.isArray(finalState.report) 
        ? Object.keys(finalState.report) 
        : []
    });
    
    if (finalState.report && typeof finalState.report === 'object' && !Array.isArray(finalState.report)) {
      console.log("✅ Structured report found!");
      console.log("Report sections:", Object.keys(finalState.report));
    } else {
      console.log("⚠️ Report is not structured (should be object, not array)");
    }
  } else {
    console.log("❌ No report field in final state");
  }

  // Token usage breakdown
  console.log("");
  console.log("💰 TOKEN USAGE BREAKDOWN:");
  Object.entries(finalState.tokenUsage || {}).forEach(([key, value]) => {
    if (key !== 'total') {
      console.log(`  ${key}: ${value} tokens`);
    }
  });
  
  console.log("");
  console.log("🎯 RECOMMENDATIONS:");
  
  // Provide recommendations based on analysis
  if (!finalState.report) {
    console.log("❌ Missing report field - check multi-node aggregation");
  } else if (Array.isArray(finalState.report)) {
    console.log("❌ Report is array instead of structured object - check SSE endpoint compilation");
  } else if (typeof finalState.report === 'object') {
    console.log("✅ Report appears to be properly structured");
  }
  
  const multiNodeResults = finalState.multiNodeResults;
  if (multiNodeResults) {
    console.log(`✅ Multi-node processing executed ${multiNodeResults.processedNodes?.length || 0} nodes`);
    if (multiNodeResults.failedNodes > 0) {
      console.log(`⚠️ ${multiNodeResults.failedNodes} nodes failed`);
    }
  } else {
    console.log("❌ Missing multi-node results");
  }
}

// CLI usage
const filePath = process.argv[2];
if (!filePath) {
  console.log("Usage: node debug-workflow.js <path-to-workflow-recording.json>");
  console.log("");
  console.log("Example:");
  console.log("node debug-workflow.js test-data/workflows/workflow-analysis-2025-07-13T11-31-01-543Z.json");
  process.exit(1);
}

analyzeWorkflowRecording(filePath);