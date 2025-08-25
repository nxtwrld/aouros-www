/**
 * Type declarations for Cornerstone.js libraries
 */

declare module "cornerstone-core" {
  export interface CornerstoneImage {
    width: number;
    height: number;
    getPixelData(): Uint16Array | Int16Array | Uint8Array | Float32Array;
    windowCenter?: number;
    windowWidth?: number;
    minPixelValue?: number;
    maxPixelValue?: number;
  }

  export interface CornerstoneViewport {
    scale: number;
    translation: { x: number; y: number };
    windowCenter?: number;
    windowWidth?: number;
  }

  export const external: {
    cornerstone?: any;
  };

  export function enable(element: HTMLElement): void;
  export function displayImage(
    element: HTMLElement,
    image: CornerstoneImage,
  ): void;
  export function loadImage(imageId: string): Promise<CornerstoneImage>;
  export function getViewport(element: HTMLElement): CornerstoneViewport;
  export function setViewport(
    element: HTMLElement,
    viewport: CornerstoneViewport,
  ): void;
}

declare module "cornerstone-wado-image-loader" {
  export const external: {
    cornerstone?: any;
    dicomParser?: any;
  };

  export const wadouri: {
    fileManager: {
      add(file: File): string;
    };
  };

  export function configure(options: {
    beforeSend?: (xhr: XMLHttpRequest) => void;
  }): void;
}

declare module "dicom-parser" {
  export interface DicomDataSet {
    string(tag: string): string | undefined;
    intString(tag: string): string | undefined;
    uint16(tag: string): number | undefined;
    uint32(tag: string): number | undefined;
  }

  export function parseDicom(byteArray: Uint8Array): DicomDataSet;
}
