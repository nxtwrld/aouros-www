// Type declarations for lamejs library
declare module "lamejs" {
  export class Mp3Encoder {
    constructor(channels: number, samplerate: number, kbps: number);
    encodeBuffer(arrayBuffer: Int16Array): Int8Array | Uint8Array;
    flush(): Int8Array | Uint8Array;
  }

  export const MPEGMode: any;
  export const Lame: any;
  export const BitStream: any;
}

declare module "lamejs/src/js/MPEGMode" {
  const MPEGMode: any;
  export default MPEGMode;
}

declare module "lamejs/src/js/Lame" {
  const Lame: any;
  export default Lame;
}

declare module "lamejs/src/js/BitStream" {
  const BitStream: any;
  export default BitStream;
}

// Extend Window interface to include lamejs globals
declare global {
  interface Window {
    MPEGMode: any;
    Lame: any;
    BitStream: any;
  }
}
