import * as THREE from "three";

export class VolumetricFlow extends THREE.Group {
    constructor() {
        super();
        this.name = "VolumetricFlow";

        // Engine Landmarks (Matches FlowStreamlines)
        this.landmarks = {
            intake: 1.1,
            lpcEnd: 3.1,
            transEnd: 3.6,
            compressorEnd: 6.1,
            diffuserEnd: 6.6,
            combustorEnd: 8.9,
            turbineEnd: 11.3,
            exhaustEnd: 15.0
        };

        this.init();
    }

    getFlowBounds(x) {
        const lm = this.landmarks;
        if (x < lm.intake) {
            const localX = x - 1.1;
            let hubR = 0.0;
            if (localX >= -1.2 && localX <= 0) {
                const t = (localX - (-1.2)) / 1.2;
                hubR = 0.55 * Math.pow(t, 0.4);
            }
            return [hubR, 1.0];
        }
        else if (x < lm.lpcEnd) return [0.55, 1.0];
        else if (x < lm.transEnd) {
            const t = (x - lm.lpcEnd) / (lm.transEnd - lm.lpcEnd);
            return [0.55 + (0.82 - 0.55) * t, 1.0];
        }
        else if (x < lm.compressorEnd) {
            return [0.72, 0.98];
        }
        else if (x < lm.diffuserEnd) {
            const t = (x - lm.compressorEnd) / (lm.diffuserEnd - lm.compressorEnd);
            const inner = 0.72 - (0.72 - 0.45) * t;
            return [inner, 1.0];
        }
        else if (x < lm.combustorEnd) {
            return [0.45, 0.95];
        }
        else if (x < lm.turbineEnd) return [0.45, 0.92];
        else return [0.0, 1.5 + (x - lm.turbineEnd) * 0.2];
    }

    init() {
        // Vertex Shader
        const vs = `
            varying vec2 vUv;
            varying float vX;
            void main() {
                vUv = uv;
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vX = worldPos.x;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `;

        // Fragment Shader (Chevron Gradient)
        const fs = `
            uniform float uTime;
            uniform float uSpeed;
            uniform float uIgnitionOffset; // Shift combustion start
            uniform float uFuelIntensity; // Flame brightness
            uniform float uLayerOpacity; // Core vs Glow opacity + Manual Toggle
            
            varying vec2 vUv;
            varying float vX;

            vec3 getColor(float x) {
                // Realistic Gradient (Dimmed for Additive Blending)
                
                // Intake Zone (-2.0 to 1.1)
                if (x < 1.1) return vec3(0.0, 0.2, 0.5); // Dim Blue
                
                // Compression Zone (1.1 to 6.1)
                if (x < 6.1) {
                    float t = (x - 1.1) / 5.0;
                    return mix(vec3(0.0, 0.2, 0.5), vec3(0.4, 0.4, 0.6), t); // Blue -> Dim White
                }
                
                // Diffuser Zone (6.1 to 6.6)
                // We allow ignition offset to encroach here if advanced
                float combStart = 6.6 + uIgnitionOffset; 
                
                if (x < combStart) {
                     return vec3(0.4, 0.4, 0.6); // Dim White
                }
                
                // Combustion Zone (combStart to 8.9)
                if (x < 8.9) {
                    float t = (x - combStart) / (8.9 - combStart);
                    
                    // Fuel Intensity scales the RED/Yellow component
                    vec3 yellow = vec3(0.5, 0.5, 0.1) * uFuelIntensity; 
                    vec3 orange = vec3(0.5, 0.2, 0.0) * uFuelIntensity;
                    
                    if (t < 0.2) return yellow; // Flash
                    return mix(orange, vec3(0.5, 0.1, 0.0) * uFuelIntensity, (t - 0.2) / 0.8);
                }
                
                // Exhaust Zone (8.9+)
                float t = min(1.0, (x - 8.9) / 4.0);
                vec3 exStart = vec3(0.5, 0.1, 0.0) * uFuelIntensity;
                vec3 exEnd = vec3(0.4, 0.2, 0.1) * max(0.5, uFuelIntensity * 0.5); // Smoke is darker
                return mix(exStart, exEnd, t);
            }

            void main() {
                // Chevron Pattern
                float freq = 20.0;
                float arrowSpeed = uTime * uSpeed;
                float xOffset = vUv.x * freq - arrowSpeed;
                float yOffset = abs(vUv.y - 0.5) * 4.0;
                float pattern = sin(xOffset - yOffset);
                
                // Sharpness
                float shape = smoothstep(0.0, 0.2, pattern); 
                
                vec3 baseColor = getColor(vX);
                
                // Fade edges
                float alpha = shape * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
                
                // Apply Layer Opacity and Fade
                float fade = 1.0;
                if (vX < -1.0) fade = smoothstep(-2.0, -1.0, vX);
                if (vX > 16.0) fade = 1.0 - smoothstep(16.0, 18.0, vX);

                // Final Alpha
                alpha *= uLayerOpacity * fade; // Note: uFuelIntensity is mostly color, but maybe minimal alpha?

                gl_FragColor = vec4(baseColor, alpha);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uSpeed: { value: 5.0 },
                uIgnitionOffset: { value: 0.0 },
                uFuelIntensity: { value: 1.0 },
                uLayerOpacity: { value: 1.0 }
            },
            vertexShader: vs,
            fragmentShader: fs,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false, // Volumetric look
            blending: THREE.AdditiveBlending
        });

        // Create Dual-Layer Beam: Core + Glow
        this.createBeamLayer(0.6, 1.0, "CoreBeam"); // Inner Dense Core
        this.createBeamLayer(1.0, 0.4, "OuterGlow"); // Outer Soft Glow
    }

    createBeamLayer(radiusScale, opacityMult, name) {
        // Create Lathe Geometry
        const points = [];
        const segments = 60; // Smoothing
        const startX = -2.0;
        const endX = 18.0;
        const step = (endX - startX) / segments;

        for (let i = 0; i <= segments; i++) {
            const x = startX + i * step;
            const bounds = this.getFlowBounds(x);
            // Ensure reasonable gap
            const inner = bounds[0];
            const outer = bounds[1];
            // Center of flow
            const mid = (inner + outer) / 2;
            const width = (outer - inner) * radiusScale; // Scale width

            points.push(new THREE.Vector2(mid + width * 0.5, x)); // Outer edge of lathe profile?
            // Actually LatheGeometry rotates around Y.
            // We want flow along X.
            // So we profile in X-Y plane, then rotate around X? 
            // Lathe rotates around Y by default.
            // We need to define points as (Radius, Y) then rotate.
            // So Radius = width/2?
            // Wait, Flow is a tube.
            // We need TubeGeometry or custom Lathe.
            // Previous code used Shells.
            // Here we want a Tube.
            // Let's use Cylinder or Tube.
            // Actually, LatheGeometry with path points?
            // Lathe Geometry input: Array of Vector2s (x, y). Rotating around Y.
            // If we want Tube along X. We need to rotate the mesh.

            // Input to Lathe: X=Radius, Y=LengthPosition.
            // Radius = (Outer+Inner)/2? No strictly width?
            // Actually we are rendering a "Beam" (Ribbon or Tube).
            // Let's assume we are rendering a Shell at the "Midpoint" of the flow channel, with width?
            // Volumetric look relies on layers.
            // Here we have Core vs Glow.

            // Let's define the points as (Radius, X).
            // r = bounds[1] (Outer).
            // Actually we want a filled volume? 
            // No, just a surface shell that glows. It's additive.
            // Let's define the surface at the Center of the channel??
            // Or Outer Surface?
            // If we use Lathe, it's hollow.
            // Let's use `bounds[1]` (Outer) for the radius, and maybe `bounds[0]` (Inner) for another?
            // This implementation uses a single surface.
            // Let's use Radius = (inner + outer) / 2.

            const radius = (inner + outer) / 2;
            // Width scaling is handled by shader fade? No logic here for width scaling?
            // The argument `radiusScale` suggests we scale the radius?
            // No `radiusScale` was used for Core (narrower?) vs Glow (wider?)
            // So: `let r = (inner + outer)/2 * radiusScale`? 
            // No, if scale < 1 it shrinks towards 0. 
            // We want it to stay centered.
            // Let `thickness` = outer - inner.
            // `r = inner + thickness/2`.
            // If we want a wide glow, maybe `r` is same, but `linewidth`?
            // Lathe is a surface.
            // If we want a volumetric beam, we might need a Tube with Thickness.
            // But basic Lathe is fine.
            // Using `r = (inner+outer)/2` puts the shell in the middle of the airway.

            // X corresponds to Y in Lathe logic (Height).
            points.push(new THREE.Vector2(radius, x));
        }

        const geo = new THREE.LatheGeometry(points, 32);
        // Rotate to align X-axis
        geo.rotateZ(-Math.PI / 2);

        const mat = this.material.clone();
        mat.uniforms.uLayerOpacity = { value: opacityMult };

        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = name;
        this.add(mesh);
    }

    update(dt, rpm, physics, simState) {
        // Accumulate time internally to avoid dependency on global clock start
        if (this.totalTime === undefined) this.totalTime = 0;
        this.totalTime += dt;

        const safeRPM = (typeof rpm === 'number' && !isNaN(rpm)) ? rpm : 0;

        // Update all children (Core and Glow)
        this.children.forEach(mesh => {
            if (mesh.material && mesh.material.uniforms) {
                const uniforms = mesh.material.uniforms;
                uniforms.uTime.value = this.totalTime; // Absolute time

                const speed = 2.0 + (safeRPM / 10000) * 8.0;
                if (!isNaN(speed)) {
                    uniforms.uSpeed.value = speed;
                } else {
                    uniforms.uSpeed.value = 2.0;
                }

                if (physics && physics.inputs) {
                    // SENSITIVITY BOOST
                    const timing = physics.inputs.ignitionTiming || 0;
                    // Timing: -5 to +5. Map to large offset -1.0 to 1.0
                    uniforms.uIgnitionOffset.value = -timing * 0.2;

                    const pressure = physics.inputs.fuelPressure || 100;
                    // Pressure: 0 to 150. Map to 0.1 to 2.0 intensity (Huge range)
                    let intensity = 0.1 + (pressure / 100) * 1.5;

                    // Manual Sim Control Override
                    if (simState) {
                        if (!simState.fuel) intensity = 0.0;
                        // If no airflow, hide everything?
                        if (!simState.airflow) uniforms.uLayerOpacity.value = 0.0;
                        else uniforms.uLayerOpacity.value = 1.0;
                    }

                    uniforms.uFuelIntensity.value = intensity;
                }
            }
        });
    }
}
