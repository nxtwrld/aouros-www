import * as THREE from 'three';

export default  {
    vertexShader: `
        uniform float time;
        uniform float pulseRate;
        varying vec2 vUv;

        void main() {
            vUv = uv;

            vec3 newPosition = position;

            // Scale factor based on time, creating a pulsating effect
            float scaleFactor = 1.0 + sin(time * pulseRate) * 0.001; // 10% scale
            newPosition *= scaleFactor;
        
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
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
        pulseRate: { value: 1.0 } // Default pulse rate
}
};