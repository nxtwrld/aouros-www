declare module 'merge-images' {
  interface MergeOptions {
    format?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
    width?: number;
    height?: number;
    Canvas?: any;
    Image?: any;
  }

  interface ImageSource {
    src: string;
    x?: number;
    y?: number;
    opacity?: number;
  }

  function mergeImages(
    sources: (string | ImageSource)[],
    options?: MergeOptions
  ): Promise<string>;

  export default mergeImages;
} 