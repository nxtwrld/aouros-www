// Specialized Medical Report Viewers - Centralized exports
// Provides easy access to all specialized medical document viewers

export { default as SurgicalReportViewer } from './SurgicalReportViewer.svelte';
export { default as PathologyReportViewer } from './PathologyReportViewer.svelte';
export { default as CardiologyReportViewer } from './CardiologyReportViewer.svelte';
export { default as RadiologyReportViewer } from './RadiologyReportViewer.svelte';
export { default as SpecializedReportViewer } from './SpecializedReportViewer.svelte';

// Export types for specialized viewers
export interface ViewerEventDetail {
  type: string;
  data: any;
}

export interface SpecializedViewerProps {
  data: any;
  confidence?: number;
  loading?: boolean;
}

// Viewer configuration for dynamic loading
export const AVAILABLE_VIEWERS = {
  surgical: 'SurgicalReportViewer',
  pathology: 'PathologyReportViewer',
  cardiology: 'CardiologyReportViewer',
  radiology: 'RadiologyReportViewer',
  // oncology: 'OncologyReportViewer',   // TODO: Implement
} as const;

export type ViewerType = keyof typeof AVAILABLE_VIEWERS;

// Helper function to check if a specialized viewer is available
export function isViewerAvailable(documentType: string): boolean {
  return documentType in AVAILABLE_VIEWERS;
}

// Helper function to get viewer component name
export function getViewerComponentName(documentType: string): string | null {
  return AVAILABLE_VIEWERS[documentType as ViewerType] || null;
}