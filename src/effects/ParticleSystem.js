import * as THREE from "three";

export class ParticleSystem extends THREE.Points {
    constructor(count = 1000) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const velocities = new Float32Array(count); // Random speed variance
        const radiuses = new Float32Array(count);   // Radial offset

        const engineLength = 25.0; // Extended length for exhaust plume (Engine is ~11.0)

        for (let i = 0; i < count; i++) {
            // Start randomly along the length to fill it initially
            const x = Math.random() * engineLength;

            // Random radius within flow path (Avoid Nacelle clipping)
            // Intake radius is ~0.9. Nacelle starts at 1.0.
            // Keep particles inside 0.85 to be safe.
            const r = Math.random() * 0.85;
            const theme = Math.random() * Math.PI * 2;

            // Position
            positions[i * 3] = x;
            positions[i * 3 + 1] = Math.cos(theme) * r;
            positions[i * 3 + 2] = Math.sin(theme) * r;

            // Store params
            velocities[i] = 1.0 + Math.random() * 0.5; // Base speed variance
            radiuses[i] = r;

            // Initial Color
            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0;
            colors[i * 3 + 2] = 1; // Blue
        }

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false, // Don't block other transparent objects
        });

        super(geometry, material);

        this.name = "AirflowParticles";
        this.count = count;
        this.velocities = velocities;
        this.radiuses = radiuses;
        this.engineLength = engineLength;
    }

    update(dt, rpm, physics) {
        const positions = this.geometry.attributes.position.array;
        const colors = this.geometry.attributes.color.array;

        // Default to idle values if physics not ready
        const stations = physics ? physics.stations : null;

        // Helper to get T/P at x
        // Simplified Linear Mapping:
        // x=0 (Amb) -> x=1 (Inlet, Stn2) -> x=4.5 (CompExit, Stn3) 
        // -> x=5.5 (Combustor, Stn4) -> x=6.5 (TurbineExit, Stn5) -> x=8 (NozzleExit, Stn8)

        for (let i = 0; i < this.count; i++) {
            const idx = i * 3;
            let x = positions[idx];

            let velocity = 0;
            let temp = 288;

            if (stations) {
                // --------------------------
                // COMPLEX AIRFLOW LOGIC
                // --------------------------

                // 1. Intake & Compressor (0 - 4.6)
                if (x < 4.6) {
                    // Determine zone
                    if (x < 1.1) {
                        velocity = 15.0 + (rpm / 100) * 40.0;
                        temp = stations[2].T;
                    } else {
                        velocity = 10.0 + (rpm / 100) * 20.0;
                        const t = (x - 1.1) / 3.5;
                        temp = stations[2].T + (stations[3].T - stations[2].T) * t;
                    }

                    // Spiral motion in compressor?
                    // radius is constant/tapers slightly
                }
                // 2. COMBUSTOR (4.6 - 6.6)
                else if (x < 6.6) {
                    // CRITICAL VISUAL: Flow Split
                    // Core Burn (Inside Liner, r < 0.7) vs Bypass/Cooling (Outside Liner, r > 0.7)
                    // We assign a "path" based on particle index or random radius?
                    // Let's rely on radius[i].

                    const r = this.radiuses[i];
                    const isCore = r < 0.65; // Inner Liner

                    if (isCore) {
                        // Inside Flame Tube -> COMBUSTION
                        velocity = 20.0 + (rpm / 100) * 40.0;
                        temp = stations[4].T; // HOT! (Red)
                    } else {
                        // Outside Liner -> BYPASS / COOLING AIR
                        velocity = 25.0 + (rpm / 100) * 45.0; // Faster, less obstruction
                        temp = stations[3].T; // COLD! (Stays Blue/Cyan)

                        // DILUTION HOLE VISUALIZATION
                        // At x ~ 5.6 (Halfway), some outer particles dive inward to mix
                        if (x > 5.5 && x < 5.7) {
                            // Suck inward
                            this.radiuses[i] *= 0.95; // Shrink radius to join core
                            // If they crossover, they heat up next frame
                        }
                    }
                }
                // 3. Turbine (6.6 - 9.0)
                else if (x < 9.0) {
                    // Mixed flow
                    velocity = 30.0 + (rpm / 100) * 50.0;
                    temp = stations[5].T; // All hot now
                }
                // 4. Nozzle (9.0+)
                else {
                    const thrustFactor = physics.state.thrust / 5000;
                    velocity = 50.0 + thrustFactor * 250.0;
                    temp = stations[8].T;
                }
            } else {
                velocity = 5.0; // Fallback
            }

            // Apply Randomness
            velocity *= this.velocities[i]; // Inherent variance

            // Move particle
            x += velocity * 0.1 * dt; // Scale down for visual scale relative to meters

            // Reset loop
            if (x > this.engineLength) {
                x = -2.0; // Start further back to visualize intake suction

                // Reset radius to ensure they enter cleanly
                this.radiuses[i] = Math.random() * 0.85;
            }
            positions[idx] = x;

            // Update Color based on Temp
            // Map Temp (288K -> 1600K) to Color Ramp
            // Blue(300) -> Cyan(500) -> Yellow(1000) -> Red(1200) -> White(1500+)

            let r = 0, g = 0, b = 1;

            if (temp < 400) { // Cold/Ambient
                // Blue -> Cyan
                // 300 -> 400
                const t = Math.min(1, (temp - 288) / 112);
                r = 0; g = t; b = 1;
            } else if (temp < 800) { // Compression Warm
                // Cyan -> Yellow/Orange?
                // 400 -> 800
                const t = (temp - 400) / 400;
                // Cyan (0,1,1) -> (1,1,0) Yellow ?
                r = t; g = 1; b = 1 - t; // Fade out blue
            } else if (temp < 1200) { // Hot
                // Yellow(1,1,0) -> Red(1,0,0)
                const t = (temp - 800) / 400;
                r = 1; g = 1 - t; b = 0;
            } else { // Very Hot (Exhaust/Fire)
                // Red -> White/Blue center?
                // 1200 -> 1600+
                const t = Math.min(1, (temp - 1200) / 400);
                r = 1; g = t; b = t; // Desaturate to white
            }

            colors[idx] = r;
            colors[idx + 1] = g;
            colors[idx + 2] = b;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
    }
}
