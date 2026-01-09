import * as THREE from "three";

export class FuelSpraySystem extends THREE.Points {
    constructor(injectorCount, injectorPositions, injectorNormals) {
        const particlesPerInjector = 20;
        const totalCount = injectorCount * particlesPerInjector;

        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(totalCount * 3);
        const life = new Float32Array(totalCount); // 0 to 1
        const velocity = new Float32Array(totalCount * 3); // Velocity vector

        // Initialize
        for (let i = 0; i < totalCount; i++) {
            life[i] = Math.random();
            pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0; // Reset later
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('life', new THREE.BufferAttribute(life, 1)); // We'll update positions in CPU or custom shader? 
        // Let's use CPU update for simplicity of spraying from specific injector locs

        // Shader Material for Droplets
        const mat = new THREE.PointsMaterial({
            color: 0xffaa00, // Fuel color
            size: 0.04, // Doubled size
            transparent: true,
            opacity: 0.9, // More opaque
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        super(geo, mat);
        this.name = "FuelSpray";

        this.injectorPositions = injectorPositions; // Array of Vector3
        this.injectorNormals = injectorNormals;     // Array of Vector3
        this.count = totalCount;
        this.particlesPerInjector = particlesPerInjector;
        this.velocities = velocity; // Cache
    }

    update(dt, fuelFlow) {
        // If no fuel, hide or reset
        if (fuelFlow <= 0.001) {
            this.visible = false;
            return;
        }
        this.visible = true;

        const positions = this.geometry.attributes.position.array;
        const life = this.geometry.attributes.life.array; // We'll just reset based on time

        // We simulate particles emitting from injectors
        // Since we don't store "injector index" per particle easily in a flat loop unless we assume order:
        // i = injIndex * perInj + pIndex

        const spraySpeed = 2.0 + fuelFlow * 5.0; // Speed increases with flow

        for (let inj = 0; inj < this.injectorPositions.length; inj++) {
            const origin = this.injectorPositions[inj];
            const normal = this.injectorNormals[inj]; // Direction of spray (usually inward/backward)

            for (let p = 0; p < this.particlesPerInjector; p++) {
                const idx = inj * this.particlesPerInjector + p;

                // Move existing
                // Life tracks "distance" effectively
                // Let's reuse 'life' as a timer 0..1
                // Actually, simplified: just move position. If too far, reset.

                // Current Pos
                let x = positions[idx * 3];
                let y = positions[idx * 3 + 1];
                let z = positions[idx * 3 + 2];

                // Move along velocity?
                // Let's store random velocity offset relative to normal
                if (x === 0 && y === 0 && z === 0) {
                    // Init
                    x = origin.x; y = origin.y; z = origin.z;
                }

                const vx = this.velocities[idx * 3];
                const vy = this.velocities[idx * 3 + 1];
                const vz = this.velocities[idx * 3 + 2];

                // If stopped or velocity not set?
                // Initialize Velocity on reset

                x += vx * dt;
                y += vy * dt;
                z += vz * dt;

                // Distance check (Squared)
                const distSq = (x - origin.x) ** 2 + (y - origin.y) ** 2 + (z - origin.z) ** 2;

                if (distSq > 0.05 * 0.05) { // 5cm spray cone
                    // RESET
                    x = origin.x;
                    y = origin.y;
                    z = origin.z;

                    // New Velocity: Normal + Random Spread
                    const spread = 0.5;
                    const rX = (Math.random() - 0.5) * spread;
                    const rY = (Math.random() - 0.5) * spread;
                    const rZ = (Math.random() - 0.5) * spread;

                    // Combine
                    this.velocities[idx * 3] = (normal.x + rX) * spraySpeed;
                    this.velocities[idx * 3 + 1] = (normal.y + rY) * spraySpeed;
                    this.velocities[idx * 3 + 2] = (normal.z + rZ) * spraySpeed;
                }

                positions[idx * 3] = x;
                positions[idx * 3 + 1] = y;
                positions[idx * 3 + 2] = z;
            }
        }

        this.geometry.attributes.position.needsUpdate = true;
    }
}
