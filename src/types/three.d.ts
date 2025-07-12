import * as THREE from 'three';

declare module 'three' {
  interface Mesh {
    velocity?: THREE.Vector3;
    initialVelocity?: THREE.Vector3;
  }
}

// Also extend Material interface to ensure dispose is always available
declare module 'three' {
  interface Material {
    dispose(): void;
  }
} 