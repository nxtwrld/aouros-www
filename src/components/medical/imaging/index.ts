// Medical Imaging Components - Centralized exports
// Provides access to DICOM viewing and medical image display components

export { default as DicomViewer } from './DicomViewer.svelte';
export { default as ImageViewerModal } from './ImageViewerModal.svelte';

// DICOM viewer configuration
export interface DicomViewerConfig {
  enableWindowLevelAdjustment: boolean;
  enableZoomPan: boolean;
  enableMultiFrame: boolean;
  defaultWindowWidth: number;
  defaultWindowLevel: number;
  maxZoom: number;
  minZoom: number;
}

export const DEFAULT_DICOM_CONFIG: DicomViewerConfig = {
  enableWindowLevelAdjustment: true,
  enableZoomPan: true,
  enableMultiFrame: true,
  defaultWindowWidth: 256,
  defaultWindowLevel: 128,
  maxZoom: 5.0,
  minZoom: 0.1,
};

// Image viewer event types
export interface ImageLoadedEvent {
  width: number;
  height: number;
  frames?: number;
  metadata?: any;
  type?: string;
}

export interface ImageExportEvent {
  dataUrl?: string;
  format: string;
  filename?: string;
}

export interface FrameChangedEvent {
  frame: number;
  totalFrames: number;
}

// DICOM metadata structure
export interface DicomMetadata {
  studyDate?: string;
  studyTime?: string;
  modality?: string;
  patientName?: string;
  patientId?: string;
  studyDescription?: string;
  seriesDescription?: string;
  institutionName?: string;
  manufacturerModelName?: string;
  sliceThickness?: number;
  imageOrientationPatient?: number[];
  imagePositionPatient?: number[];
  pixelSpacing?: number[];
  windowCenter?: number;
  windowWidth?: number;
  rescaleIntercept?: number;
  rescaleSlope?: number;
}

// Study information for viewer
export interface StudyInfo {
  studyInstanceUID?: string;
  seriesInstanceUID?: string;
  sopInstanceUID?: string;
  patientName?: string;
  studyDate?: string;
  modality?: string;
  studyDescription?: string;
  seriesDescription?: string;
  numberOfFrames?: number;
}

// Supported image formats
export type ImageFormat = 'dicom' | 'standard' | 'jpeg' | 'png' | 'bmp' | 'tiff';

// Viewer modes
export type ViewerMode = 'single' | 'multi' | 'compare' | 'stack';

// Window presets for different anatomies
export const WINDOW_PRESETS = {
  // CT presets
  abdomen: { width: 400, level: 50 },
  bone: { width: 1500, level: 400 },
  brain: { width: 100, level: 50 },
  chest: { width: 1500, level: -600 },
  liver: { width: 150, level: 90 },
  lung: { width: 1400, level: -500 },
  mediastinum: { width: 350, level: 25 },
  
  // MRI presets
  t1: { width: 600, level: 300 },
  t2: { width: 600, level: 300 },
  flair: { width: 600, level: 300 },
  
  // Default
  default: { width: 256, level: 128 },
} as const;

export type WindowPreset = keyof typeof WINDOW_PRESETS;

// Helper functions
export function getWindowPreset(preset: WindowPreset) {
  return WINDOW_PRESETS[preset] || WINDOW_PRESETS.default;
}

export function detectImageFormat(buffer: ArrayBuffer): ImageFormat {
  const view = new DataView(buffer);
  
  // Check for DICOM
  if (buffer.byteLength > 132) {
    const prefix = new TextDecoder().decode(buffer.slice(128, 132));
    if (prefix === 'DICM') {
      return 'dicom';
    }
  }
  
  // Check for common image formats
  const signature = new Uint8Array(buffer.slice(0, 4));
  
  // JPEG
  if (signature[0] === 0xFF && signature[1] === 0xD8) {
    return 'jpeg';
  }
  
  // PNG
  if (signature[0] === 0x89 && signature[1] === 0x50 && 
      signature[2] === 0x4E && signature[3] === 0x47) {
    return 'png';
  }
  
  // BMP
  if (signature[0] === 0x42 && signature[1] === 0x4D) {
    return 'bmp';
  }
  
  // TIFF
  if ((signature[0] === 0x49 && signature[1] === 0x49) ||
      (signature[0] === 0x4D && signature[1] === 0x4D)) {
    return 'tiff';
  }
  
  return 'standard';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function createImageUrl(buffer: ArrayBuffer, format: ImageFormat): string {
  const blob = new Blob([buffer], { 
    type: format === 'dicom' ? 'application/dicom' : `image/${format}` 
  });
  return URL.createObjectURL(blob);
}

export function revokeImageUrl(url: string): void {
  URL.revokeObjectURL(url);
}