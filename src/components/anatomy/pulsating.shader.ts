import * as THREE from "three";

export default {
  vertexShader: `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
  fragmentShader: `
        varying vec2 vUv;
        uniform float time;
        uniform float pulseRate;
        uniform vec3 originalColor;
        uniform float opacity;

        void main() {
            float alpha = mix(opacity, 1.0, sin(time * pulseRate) * 0.5 + 0.5);
            gl_FragColor = vec4(originalColor, alpha);
        }
    `,
  uniforms: {
    time: { value: 0 },
    originalColor: { value: new THREE.Color() },
    opacity: { value: 0.7 },
    pulseRate: { value: 1.0 }, // Default pulse rate
  },
};
