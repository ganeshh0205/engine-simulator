import * as THREE from "three";

export class ParticleSystem extends THREE.Points {
    constructor(count = 10000) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const velocities = new Float32Array(count);
        const radFactors = new Float32Array(count);   // 0.0 to 1.0 relative to flow channel

        const engineLength = 25.0;

        for (let i = 0; i < count; i++) {
            const x = Math.random() * engineLength;

            // Initial Random Factors
            radFactors[i] = Math.random();
            const theta = Math.random() * Math.PI * 2;

            // Initial Position
            positions[i * 3] = x;
            // Initialize Y/Z so theta can be recovered in update()
            const initialR = 1.0;
            positions[i * 3 + 1] = Math.cos(theta) * initialR;
            positions[i * 3 + 2] = Math.sin(theta) * initialR;

            velocities[i] = 1.0 + Math.random() * 0.5;

            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0.5; // Cyanish
            colors[i * 3 + 2] = 1;
        }

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.06, // Smaller but visible
            vertexColors: true,
            transparent: true,
            opacity: 0.5, // Balanced opacity
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        super(geometry, material);

        this.name = "AirflowParticles";
        this.count = count;
        this.velocities = velocities;
        this.radFactors = radFactors;
        this.engineLength = engineLength;

        // ... (Landmarks remain same) ...
        this.landmarks = {
            intake: 1.1,
            lpcEnd: 3.1,
            transEnd: 3.6,
            compressorEnd: 6.1,
            diffuserEnd: 6.6,
            combustorEnd: 8.9,
            turbineEnd: 12.1, // Adjusted for Extended Turbine (8.9 + 3.2)
            nozzleEnd: 14.1 // Adjusted for Nozzle (12.1 + 2.0)
        };
    }

    getFlowBounds(x) {
        // Return [innerRadius, outerRadius]
        // MARGIN: 0.03 visual safety margin to prevent wall clipping
        const margin = 0.03;
        const outerLimit = (r) => r - margin;
        const innerLimit = (r) => r + margin;

        const lm = this.landmarks;

        // 1. INTAKE (0.0 -> 1.1)
        if (x < lm.intake) {
            // Hub: Spinner (0 -> 0.55) Power 0.4 Profile
            // Casing: 1.0
            const localX = x; // Starts at 0 relative to engine
            if (localX < 0) return [0, 1.0]; // Should not happen

            const t = localX / 1.1;
            // Intake.js: r = rLPC * t^0.4. rLPC = 0.55.
            const hub = 0.55 * Math.pow(t, 0.4);
            return [innerLimit(hub), outerLimit(1.0)];
        }

        // 2. LPC (1.1 -> 3.1)
        else if (x < lm.lpcEnd) {
            // Hub: 0.55 Constant
            // Casing: 1.0
            return [innerLimit(0.55), outerLimit(1.0)];
        }

        // 3. TRANSITION (3.1 -> 3.6)
        else if (x < lm.transEnd) {
            // Hub: 0.55 -> 0.82 Linear
            // Casing: 1.0
            const t = (x - lm.lpcEnd) / (lm.transEnd - lm.lpcEnd);
            const hub = 0.55 + (0.82 - 0.55) * t;
            return [innerLimit(hub), outerLimit(1.0)];
        }

        // 4. HPC (3.6 -> 6.1)
        else if (x < lm.compressorEnd) {
            // Hub: 0.82 Constant
            // Casing: 1.0
            return [innerLimit(0.82), outerLimit(1.0)];
        }

        // 5. DIFFUSER (6.1 -> 6.6)
        else if (x < lm.diffuserEnd) {
            // Hub: 0.82 -> 0.45 (Combustor Inner)
            // Casing: 1.0 -> 0.95 (Combustor Liner Outer)
            const t = (x - lm.compressorEnd) / (lm.diffuserEnd - lm.compressorEnd);
            const hub = 0.82 + (0.45 - 0.82) * t;
            const outer = 1.0 + (0.95 - 1.0) * t;
            return [innerLimit(hub), outerLimit(outer)];
        }

        // 6. COMBUSTOR (6.6 -> 8.9)
        else if (x < lm.combustorEnd) {
            // Hub: 0.45 Constant
            // Casing: 0.95 (Liner)
            return [innerLimit(0.45), outerLimit(0.95)];
        }

        // 7. TURBINE (8.9 -> 11.3)
        // Expanding Frustum
        else if (x < lm.turbineEnd) {
            const t = (x - lm.combustorEnd) / (lm.turbineEnd - lm.combustorEnd);
            // Hub: 0.45 -> 0.70
            // Casing: 1.00 -> 1.55 (Exact Casing)
            // Particle Limit: Casing - Margin (0.05)
            // Start: 0.95 (Combustor End) -> 1.50 (Turbine End)
            // Note: Turbine Casing starts at 1.0, but Combustor Liner is 0.95.
            // Visually keeping flow continuous 0.95 -> 1.50 is better than jumping to 1.0.
            const hub = 0.45 + (0.70 - 0.45) * t;
            const outer = 0.95 + (1.50 - 0.95) * t;
            return [innerLimit(hub), outerLimit(outer)];
        }

        // 8. NOZZLE (11.3 -> 13.3)
        else if (x < lm.nozzleEnd) {
            const nozzleStart = lm.turbineEnd; // 11.3
            const nozzleThroat = nozzleStart + 0.8; // 12.1 (40%)

            let outer = 0;
            let inner = 0;

            if (x < nozzleThroat) {
                // Segment 1: Inlet (1.50 matches Turbine Exit) -> Throat (1.20)
                // Casing Throat is 1.25. Margin 0.05 -> 1.20.
                const t = (x - nozzleStart) / 0.8;
                outer = 1.50 + (1.20 - 1.50) * t;

                // Hub: Linear Cone 0.7 -> 0.0 (Overall)
                const tGlobal = (x - nozzleStart) / 2.0;
                inner = 0.7 * (1.0 - tGlobal);
            } else {
                // Segment 2: Throat (1.20) -> Exit (0.90)
                // Casing Exit is 0.95. Margin 0.05 -> 0.90.
                const t = (x - nozzleThroat) / (lm.nozzleEnd - nozzleThroat);
                outer = 1.20 + (0.90 - 1.20) * t;

                const tGlobal = (x - nozzleStart) / 2.0;
                inner = 0.7 * (1.0 - tGlobal);
            }

            // Note: We already applied margins in the variables above (1.50 vs 1.55).
            // So we return them DIRECTLY without adding margin AGAIN.
            // Inner already matches Hub (0.7). Add 0.03 margin to avoid surface z-fight?
            return [inner + 0.03, outer];
        }

        // 9. EXHAUST (Diverging Plume)
        else {
            // User requested "diverge out" after exiting.
            // Start at Nozzle Exit radius (0.90) and expand.
            const dist = x - lm.nozzleEnd;
            const spread = dist * 0.15; // 15% slope expansion

            return [0.0, 0.90 + spread];
        }
    }

    update(dt, rpm, physics, simState) {
        // ... (SimState visibility check) ...
        if (simState) {
            this.visible = simState.airflow;
            if (!this.visible) return;
        } else {
            this.visible = true;
        }

        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;
        const stations = physics ? physics.stations : null;
        const lm = this.landmarks;

        // Dimming Factor to prevent Supernova
        const intensity = 0.7;

        for (let i = 0; i < this.count; i++) {
            // ... (Physics movement logic remains same) ...
            const idx = i * 3;
            // 1. Move Axially First
            let x = positions[idx];

            // Calculate Velocity based on previous position (approx is fine)
            let velocity = 5.0;
            let temp = 300;
            if (x < lm.intake) {
                velocity = 15 + (rpm / 1000) * 5;
                temp = stations ? stations[2].T : 288;
            } else if (x < lm.compressorEnd) {
                velocity = 12 + (rpm / 1000) * 10;
                const t = (x - lm.intake) / (lm.compressorEnd - lm.intake);
                if (stations) temp = stations[2].T + (stations[3].T - stations[2].T) * t;
            } else if (x < lm.combustorEnd) {
                velocity = 20 + (rpm / 1000) * 15;
                if (stations) temp = stations[4].T;
            } else if (x < lm.turbineEnd) {
                velocity = 30 + (rpm / 1000) * 20;
                if (stations) temp = stations[5].T;
            } else {
                velocity = 50 + (rpm / 1000) * 50;
                if (stations) temp = stations[8].T;
            }

            velocity *= this.velocities[i];
            x += velocity * 0.1 * dt; // Move

            // Wrap around
            if (x > this.engineLength) x = -2.0;
            positions[idx] = x;

            // 2. Constrain Radius at NEW Position
            const [minR, maxR] = this.getFlowBounds(x);
            const r = minR + this.radFactors[i] * (maxR - minR);

            // 3. Spin
            const theta = Math.atan2(positions[idx + 2], positions[idx + 1]);
            let spinSpeed = 0;
            if (x > lm.intake && x < lm.turbineEnd) spinSpeed = (rpm / 60) * dt * 0.5;
            const newTheta = theta + spinSpeed;

            positions[idx + 1] = Math.cos(newTheta) * r;
            positions[idx + 2] = Math.sin(newTheta) * r;

            // Color Logic 
            // Color Logic (Realistic Air/Fuel/Fire)
            let rC = 0, gC = 0, bC = 0;

            const isCombustor = (x > lm.diffuserEnd && x < lm.combustorEnd);
            const isTurbine = (x >= lm.combustorEnd);

            // Normalized "Pressure" Color for Air (Non-Combustion)
            // Range: 0 (Cold) to 1 (Max Compression Heat)
            let tP = (temp - 288) / 400;
            if (tP < 0) tP = 0; if (tP > 1) tP = 1;

            // Base Air Color: Cold (Cyan) -> Hot Compression (Deep Blue)
            // Cold: 0.6, 0.9, 1.0 (Cyan)
            // Hot Comp: 0.1, 0.3, 0.9 (Blue)
            rC = 0.6 - 0.5 * tP;
            gC = 0.9 - 0.6 * tP;
            bC = 1.0 - 0.1 * tP;

            // Manual Control Overrides
            if (simState) {
                const { fuel, ignition } = simState;

                if (isCombustor) {
                    if (fuel && !ignition) {
                        // Fuel Mist (White/Grey) - ONLY if Fuel is ON
                        rC = 0.95; gC = 0.95; bC = 0.95;
                    } else if (fuel && ignition) {
                        // Combustion (Bright Orange/Yellow) - REQUIRES both Fuel & Ignition
                        const p = (x - lm.diffuserEnd) / (lm.combustorEnd - lm.diffuserEnd);
                        if (p < 0.2) {
                            // Injection Point: White/Yellow
                            rC = 1.0; gC = 0.9; bC = 0.6;
                        } else {
                            // Main Flame: Orange -> Red
                            rC = 1.0;
                            gC = 0.5 * (1.0 - p); // Fades green component
                            bC = 0.0;
                        }
                    }
                } else if (isTurbine) {
                    // Exhaust Trail (If Combustion active)
                    if (fuel && ignition) {
                        // Fading Orange
                        rC = 1.0; gC = 0.4; bC = 0.1;
                    }
                }
            }

            // Apply Intensity Scaling
            colors[idx] = rC * intensity;
            colors[idx + 1] = gC * intensity;
            colors[idx + 2] = bC * intensity;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
}
