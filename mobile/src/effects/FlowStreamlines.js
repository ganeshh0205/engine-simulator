import * as THREE from "three";

export class FlowStreamlines extends THREE.Group {
    constructor(count = 300) {
        super();
        this.name = "FlowStreamlines";
        this.count = count;

        // Landmarks
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

    getFlow(x) {
        // Return { radius: [min,max], swirl: factor }
        const lm = this.landmarks;

        if (x < lm.intake) {
            const localX = x - 1.1;
            let hubR = 0.0;
            if (localX >= -1.2 && localX <= 0) {
                const t = (localX - (-1.2)) / 1.2;
                hubR = 0.55 * Math.pow(t, 0.4);
            }
            return { r: [hubR, 1.0], twist: 0 };
        }
        else if (x < lm.lpcEnd) return { r: [0.55, 1.0], twist: 1.0 };
        else if (x < lm.transEnd) {
            const t = (x - lm.lpcEnd) / (lm.transEnd - lm.lpcEnd);
            return { r: [0.55 + (0.82 - 0.55) * t, 1.0], twist: 1.0 };
        }
        else if (x < lm.compressorEnd) {
            // HPC
            return { r: [0.72, 0.98], twist: 2.0 };
        }
        else if (x < lm.diffuserEnd) {
            // Diffuser
            const t = (x - lm.compressorEnd) / (lm.diffuserEnd - lm.compressorEnd);
            const inner = 0.72 - (0.72 - 0.45) * t;
            // Slow twist in diffuser
            return { r: [inner, 1.0], twist: 0.5 };
        }
        else if (x < lm.combustorEnd) {
            // Combustor
            return { r: [0.45, 0.95], twist: 0.2 };
        }
        else return { r: [0.45, 0.92], twist: 3.0 }; // Turbine
    }

    init() {
        // Geometry: Elongated "Streak" (Capsule-like)
        // Length 0.4, Width 0.02
        const geometry = new THREE.CylinderGeometry(0.015, 0.015, 0.2, 8, 1);
        geometry.rotateZ(Math.PI / 2); // Point along X

        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 1.5,
            roughness: 0.4,
            metalness: 0.8,
            transparent: true,
            opacity: 0.4, // Lower base opacity for additive accumulation
            depthWrite: false,
            blending: THREE.AdditiveBlending // Glowing Gas Effect
        });

        this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        // Fix: Explicitly create instanceColor if it doesn't exist
        if (!this.mesh.instanceColor) {
            this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.count * 3), 3);
        }
        this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

        this.add(this.mesh);

        // Init State
        this.particles = [];
        for (let i = 0; i < this.count; i++) {
            this.particles.push({
                x: -2.0 + Math.random() * 18.0,
                rad: Math.random(),
                angle: Math.random() * Math.PI * 2,
                speedOffset: 0.8 + Math.random() * 0.4,
                wobbleFreq: 10 + Math.random() * 20, // Turbulence Frequency
                wobblePhase: Math.random() * Math.PI * 2
            });
        }
    }

    update(dt, rpm, physics) {
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const lm = this.landmarks;
        const time = performance.now() * 0.001;

        let i = 0;

        for (const p of this.particles) {
            // 1. Move
            let velocity = 8.0;
            let turbulence = 0.0;

            if (p.x < lm.compressorEnd) {
                velocity = 6.0 + (rpm / 5000) * 2;
                turbulence = 0.02; // Laminar in compressor
            }
            else if (p.x < lm.combustorEnd) {
                velocity = 12.0;
                turbulence = 0.15; // Turbulent in combustion
            }
            else {
                velocity = 25.0;
                turbulence = 0.1; // Exhaust
            }

            p.x += velocity * p.speedOffset * dt;

            if (p.x > lm.exhaustEnd + 1.0) {
                p.x = -1.5;
                p.angle = Math.random() * Math.PI * 2;
                p.rad = Math.random();
            }

            // 2. Position & Swirl
            const flow = this.getFlow(p.x);
            const [minR, maxR] = flow.r;
            // Add Turbulence to Radius
            const turbR = Math.sin(time * p.wobbleFreq + p.wobblePhase) * turbulence;
            const r = THREE.MathUtils.clamp(minR + p.rad * (maxR - minR) + turbR, 0, 1.5);

            // Twist
            const twistSpeed = (rpm / 60) * Math.PI * 2;
            p.angle += twistSpeed * flow.twist * dt * 0.5;

            // Add Turbulence to Angle (Jitter)
            const turbAng = Math.cos(time * p.wobbleFreq * 0.8 + p.wobblePhase) * turbulence * 2.0;
            const finalAngle = p.angle + turbAng;

            const y = Math.cos(finalAngle) * r;
            const z = Math.sin(finalAngle) * r;

            dummy.position.set(p.x, y, z);

            // Orient along flow?
            // Approximate LookAt Next position?
            // Cheap way: Look at (x+0.1, nextY, nextZ)
            // Or just RotateX is mainly correct, but we want Spiral tilt.
            // Tilt = atan(TangentialV / AxialV).
            // Tangential = r * omega. 
            // Omega = twistSpeed * flow.twist.
            const tanV = r * (twistSpeed * flow.twist);
            // const rollAngle = Math.atan2(tanV, velocity); // Not used in final lookAt

            // LookAt with Jitter
            const lookTurb = turbulence * 0.5;
            dummy.lookAt(
                p.x + 1.0,
                y + Math.cos(finalAngle + Math.PI / 2) * (r * twistSpeed * 0.1) + (Math.random() - 0.5) * lookTurb,
                z + Math.sin(finalAngle + Math.PI / 2) * (r * twistSpeed * 0.1) + (Math.random() - 0.5) * lookTurb
            );

            // dummy.rotation.x = rollAngle; // Simplistic
            // Actually lookAt does the job if we predict next point.

            // Stretch based on velocity, but add some random flicker length
            const stretch = 1.0 + velocity * 0.08 + Math.sin(time * 30 + i) * 0.2;
            dummy.scale.set(stretch, 1.0, 1.0);

            dummy.updateMatrix();
            this.mesh.setMatrixAt(i, dummy.matrix);

            // 3. Color
            // STRICT LOGIC: BLUE ONLY BEFORE DIFFUSER. ORANGE ONLY AFTER.

            let rC = 0, gC = 0, bC = 0;

            if (p.x < lm.compressorEnd) {
                // COMPRESSOR / INTAKE
                // Cyan -> White/Blue
                // 0.0 -> 0.6
                const t = Math.max(0, (p.x - 1.1) / 5.0);
                rC = t * 0.2; gC = 0.8 - t * 0.2; bC = 1.0;
            } else if (p.x < lm.diffuserEnd) {
                // DIFFUSER (Transition)
                // Start of Diffuser = 6.1. End = 6.6.
                // Keep it Blue/White. No Ignition yet.
                rC = 0.5; gC = 0.7; bC = 1.0;
            } else if (p.x < lm.combustorEnd) {
                // COMBUSTOR
                // Start = 6.6. End = 8.9.
                // Ignition immediately?
                // Fade from Transparent to Orange?
                // Or Yellow -> Orange.

                const t = (p.x - lm.diffuserEnd) / (lm.combustorEnd - lm.diffuserEnd);
                // 0.0 -> Yellow. 1.0 -> Orange.
                rC = 1.0;
                gC = 0.8 - t * 0.5; // 0.8 -> 0.3
                bC = 0.0;
            } else {
                // EXHAUST
                rC = 1.0; gC = 0.4; bC = 0.2;
            }

            color.setRGB(rC, gC, bC);
            this.mesh.setColorAt(i, color);

            i++;
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
}
