import * as THREE from 'three';

export default {
    vertexShader: `
    varying vec3 vNormal;
    void main() 
    {
        vNormal = normalize( normalMatrix * normal );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
    `,
    fragmentShader: `

    varying vec3 vNormal;
    void main() 
    {
        float intensity = pow( 0.7 - dot( vNormal, vec3( 0.0, 0.0, 1.0 ) ), 4.0 ); 
        gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 ) * intensity;
    }
    
    `,
    uniforms: {
        glowIntensity: { value: 1.5 },
        glowColor: { value: new THREE.Color(0x00ff00) } // Ethereal green glow
    },
    extras : {
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    }
};
