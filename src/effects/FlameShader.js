/**
 * FlameShader.js
 * A custom GLSL shader for volumetric flame/combustion visualization.
 * Uses 3D noise and scrolling UVs to create a fire effect tailored for a jet engine combustor.
 */

import * as THREE from 'three';

export const CombustionShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uThrottle; // 0.0 to 1.0
    uniform float uAFR;      // 0.0 (Rich) to 1.0 (Lean) mapping
    
    varying vec2 vUv;
    varying vec3 vPosition;

    // Simple Pseudo-Random Noise
    float rand(vec2 n) { 
        return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }

    float noise(vec2 p) {
        vec2 ip = floor(p);
        vec2 u = fract(p);
        u = u*u*(3.0-2.0*u);
        
        float res = mix(
            mix(rand(ip), rand(ip+vec2(1.0,0.0)), u.x),
            mix(rand(ip+vec2(0.0,1.0)), rand(ip+vec2(1.0,1.0)), u.x), u.y);
        return res;
    }

    void main() {
        // Scroll noise along X (engine flow axis)
        vec2 uv = vUv;
        float speed = 5.0 + uThrottle * 10.0;
        uv.x -= uTime * speed; 
        
        // Multiple octaves
        float n = noise(uv * 10.0);
        n += noise(uv * 20.0) * 0.5;
        n += noise(uv * 5.0 + vec2(uTime, 0.0)) * 0.25; // Flicker
        n /= 1.75;

        // Shape the flame: Fade out at edges and end
        // Core (y=0.5) is hottest
        float centerline = 1.0 - abs(vUv.y - 0.5) * 2.0; 
        // Fade in at start (x=0) and out at end (x=1)
        float longFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.4, vUv.x);
        
        float intensity = n * centerline * longFade;
        
        // Thresholding for "Fire" look
        intensity = pow(intensity, 2.0); // Contrast
        intensity *= (uThrottle + 0.5); // Brightness base (Increased from 0.2 for visibility)

        // Color ramp based on Temp/AFR
        // Rich (Low AFR) = Orange/Sooty
        // Lean (High AFR) = Blue/Violet
        
        vec3 colorRich = vec3(1.0, 0.3, 0.0); // Orange
        vec3 colorLean = vec3(0.0, 0.5, 1.0); // Blue
        vec3 colorHot = vec3(1.0, 0.9, 0.5);  // White/Yellow core
        
        // Mix based on uAFR input (0=Rich15, 1=Lean60)
        // Actually normalized 0-1
        vec3 baseColor = mix(colorRich, colorLean, uAFR);
        
        // Final gradient: Core is white-hot, edges take base color
        vec3 finalColor = mix(baseColor, colorHot, intensity);

        // Alpha: Transparent where noise is low
        float alpha = smoothstep(0.1, 0.4, intensity);
        
        gl_FragColor = vec4(finalColor * 2.0, alpha * 0.8); // *2.0 for Bloom punch
    }
  `
};
