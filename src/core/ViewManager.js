import * as THREE from "three";

export class ViewManager {
    constructor(engine, renderer, physics) {
        this.engine = engine;
        this.renderer = renderer;
        this.physics = physics; // Access to T2, T3, T4 for HeatMap
        this.auxiliaries = []; // Non-engine objects (Flames, Particles)
        this.isExploded = false;
        this.explosionGap = 1.5; // Gap between components in exploded view

        // Store original positions for explosion reset
        this.originalX = new Map();
        this.explodedTargets = new Map();

        // Store original opacity/materials for isolation
        this.originalMaterials = new Map();

        this.init();
    }

    addAuxiliary(object) {
        if (object) this.auxiliaries.push(object);
    }

    clear() {
        this.originalX.clear();
        this.originalMaterials.clear();
        this.subOriginalPos = null;
        this.explodedComponent = null;
        this.isExploded = false;
        // Reset auxiliaries? No, they might persist (Particles), but we might need to verify them.
    }

    init() {
        // Clear previous state
        this.clear();
        this.originalMatInstances = new Map(); // Store Ref for Mode switching

        // Record initial state
        let index = 0;
        this.engine.children.forEach((child) => {
            // Store Position
            this.originalX.set(child.uuid, child.position.x);

            // Store material properties for isolation logic AND Instances for Mode logic
            child.traverse((mesh) => {
                if (mesh.isMesh && mesh.material) {
                    // Store Instance
                    this.originalMatInstances.set(mesh.uuid, mesh.material);

                    // Skip multi-materials for now to avoid complexity/crashes
                    if (Array.isArray(mesh.material)) return;

                    // Skip materials without color/emissive (e.g. Basic/Depth/Shader potentially)
                    if (!mesh.material.color || !mesh.material.emissive) return;

                    this.originalMaterials.set(mesh.uuid, {
                        opacity: mesh.material.opacity,
                        transparent: mesh.material.transparent,
                        color: mesh.material.color.clone(),
                        emissive: mesh.material.emissive.clone(),
                        metalness: mesh.material.metalness,
                        roughness: mesh.material.roughness
                    });
                }
            });
            index++;
        });
    }

    // ============================================
    // ISOLATION MODE (Focus on one component)
    // ============================================
    isolate(targetComponent) {
        if (!targetComponent) return;
        console.log("ViewManager: Isolating", targetComponent.name);

        this.engine.children.forEach((child) => {
            if (child === targetComponent) {
                child.visible = true;
                this.highlight(child, true); // Turn ON highlight
            } else {
                child.visible = false;
                this.highlight(child, false); // Turn OFF highlight
            }
        });

        // Always show Airflow (Particles) for context
        // Show Flames ONLY if Combustor is target
        const isCombustor = targetComponent.name === 'Combustor';

        this.auxiliaries.forEach(aux => {
            if (aux.name === 'ParticleSystem') {
                aux.visible = true; // Keep Airflow
            } else if (aux.name === 'CombustionFlames') {
                aux.visible = isCombustor;
            } else {
                aux.visible = false;
            }
        });
    }

    highlight(component, state) {
        // Apply a visual pulse or color shift to the active component
        component.traverse((child) => {
            if (child.isMesh && child.material) {
                if (state) {
                    // Save original emissive if not saved
                    if (!child.userData.originalEmissive) {
                        child.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0, 0, 0);
                    }
                    // Set to a subtle Blue highlight matching AERO
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x0044aa);
                        child.material.emissiveIntensity = 0.5;
                    }
                } else {
                    // Restore
                    if (child.userData.originalEmissive && child.material.emissive) {
                        child.material.emissive.copy(child.userData.originalEmissive);
                        child.material.emissiveIntensity = 1.0; // Reset
                    }
                }
            }
        });
    }

    resetIsolation() {
        // Restore visibility for all components
        this.engine.children.forEach((child) => {
            child.visible = true;
            this.highlight(child, false);
        });

        // Restore Auxiliaries
        this.auxiliaries.forEach(aux => aux.visible = true);
    }

    // ============================================
    // EXPLODED VIEW (Global)
    // ============================================
    toggleExploded() {
        this.isExploded = !this.isExploded;
        console.log("Exploded View:", this.isExploded);
    }

    // ============================================
    // SUB-COMPONENT EXPLOSION (Deep Analysis)
    // ============================================
    explodeSubComponent(targetComponent) {
        if (this.explodedComponent === targetComponent) {
            this.resetSubExplosion();
            return;
        }

        this.resetSubExplosion();
        this.explodedComponent = targetComponent;

        // Map: UUID -> {x, y, z}
        this.subOriginalPos = new Map();

        // Helper to store position
        const storePos = (obj) => {
            this.subOriginalPos.set(obj.uuid, obj.position.clone());
            if (obj.children.length > 0) {
                obj.children.forEach(storePos);
            }
        };

        // Store recursive positions
        storePos(targetComponent);

        console.log("Exploding Sub-Component:", targetComponent.name);
    }

    resetSubExplosion() {
        if (!this.explodedComponent) return;

        // Snap back using stored positions
        const restorePos = (obj) => {
            const orig = this.subOriginalPos.get(obj.uuid);
            if (orig) obj.position.copy(orig);
            if (obj.children.length > 0) {
                obj.children.forEach(restorePos);
            }
        };
        restorePos(this.explodedComponent);

        this.explodedComponent = null;
        this.subOriginalPos = null;
    }

    // ============================================
    // VIEW MODES (Materials)
    // ============================================
    createCheckerTexture() {
        if (this.checkerTexture) return this.checkerTexture;

        const width = 512;
        const height = 512;
        const size = width * height;
        const data = new Uint8Array(4 * size);

        const colors = [new THREE.Color(0xffffff), new THREE.Color(0x333333)];

        for (let i = 0; i < size; i++) {
            const stride = i * 4;
            const x = i % width;
            const y = Math.floor(i / width);
            const check = ((Math.floor(x / 32) + Math.floor(y / 32)) % 2 === 0) ? 0 : 1;
            const color = colors[check];

            data[stride] = color.r * 255;
            data[stride + 1] = color.g * 255;
            data[stride + 2] = color.b * 255;
            data[stride + 3] = 255;
        }

        const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.needsUpdate = true;
        this.checkerTexture = texture;
        return texture;
    }

    createHeatShader() {
        if (this.heatShader) return this.heatShader;

        // Vertex Shader: Pass World Position
        const vs = `
            varying vec3 vWorldPos;
            varying vec3 vNormal;
            void main() {
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `;

        // Fragment Shader: Physics-Based Temp Map
        const fs = `
            uniform float uT2; // Inlet
            uniform float uT3; // Compressor Exit
            uniform float uT4; // Combustor Exit
            uniform float uT5; // Turbine Exit
            
            varying vec3 vWorldPos;
            varying vec3 vNormal;
            
            // Thermal Color Map (Black -> Blue -> Cyan -> Green -> Yellow -> Red -> White)
            vec3 heatColor(float temp) {
                // Modified Range: 300K (Ambient) to 1100K (Max Visual Heat)
                // This ensures T5 (~900K) looks RED/ORANGE, not Blue.
                float t = clamp((temp - 300.0) / 800.0, 0.0, 1.0);
                
                vec3 c = vec3(0.0);
                if (t < 0.2) return mix(vec3(0,0,0.5), vec3(0,0,1), t/0.2); // Cold Blue
                if (t < 0.4) return mix(vec3(0,0,1), vec3(0,1,1), (t-0.2)/0.2); // Cyan
                if (t < 0.6) return mix(vec3(0,1,1), vec3(1,1,0), (t-0.4)/0.2); // Green-Yellow
                if (t < 0.8) return mix(vec3(1,1,0), vec3(1,0.5,0), (t-0.6)/0.2); // Orange (Tweaked)
                return mix(vec3(1,0.5,0), vec3(1,1,1), (t-0.8)/0.2); // Red/White
            }

            void main() {
                 float x = vWorldPos.x;
                 
                 // Calibrated Station Locations (World X) for Turbojet
                 // Intake: 0.0 - 1.1
                 // Compressor: 1.1 - 4.6
                 // Combustor: 4.6 - 6.6
                 // Turbine: 6.6 - 9.0
                 // Nozzle: 9.0 - 11.0
                 
                 float localT = uT2;
                 
                 // Interpolate Temperature based on Position
                 if (x < 1.1) {
                     localT = uT2;
                 } else if (x < 4.6) {
                     // Compressor: 1.1 to 4.6 (Range 3.5)
                     localT = mix(uT2, uT3, (x - 1.1) / 3.5);
                 } else if (x < 6.6) {
                     // Combustor: 4.6 to 6.6 (Range 2.0)
                     localT = mix(uT3, uT4, (x - 4.6) / 2.0);
                 } else if (x < 9.0) {
                     // Turbine: 6.6 to 9.0 (Range 2.4)
                     localT = mix(uT4, uT5, (x - 6.6) / 2.4);
                 } else {
                     // Nozzle
                     localT = uT5;
                 }
                 
                 vec3 color = heatColor(localT);
                 
                 // Simple lighting
                 vec3 light = normalize(vec3(0.5, 1.0, 0.5));
                 float diff = max(dot(vNormal, light), 0.4);
                 
                 gl_FragColor = vec4(color * diff, 1.0);
            }
        `;

        this.heatShader = new THREE.ShaderMaterial({
            uniforms: {
                uT2: { value: 300.0 },
                uT3: { value: 400.0 },
                uT4: { value: 1000.0 },
                uT5: { value: 800.0 }
            },
            vertexShader: vs,
            fragmentShader: fs,
            side: THREE.DoubleSide
        });
        return this.heatShader;
    }

    // Stub to prevent re-declaration
    setMaterialMode_impl(mode) {
        // ... (Existing implementation not touched by this tool)
    }

    setMaterialMode(mode) {
        console.log("Switching Material Mode:", mode);
        this.currentMode = mode;

        let overrideMat = null;

        // Prepare the Override Material based on Mode
        if (mode === 'Wireframe') {
            overrideMat = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.3
            });
        }
        else if (mode === 'Glass') {
            overrideMat = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                metalness: 0.1,
                roughness: 0.1,
                transmission: 0.7,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
        }
        else if (mode === 'Clay') {
            overrideMat = new THREE.MeshStandardMaterial({
                color: 0xdddddd,
                roughness: 1.0,
                metalness: 0.0
            });
        }
        else if (mode === 'Metallic') {
            overrideMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.1,
                metalness: 1.0,
                envMapIntensity: 1.0
            });
        }
        else if (mode === 'UV') {
            const map = this.createCheckerTexture();
            overrideMat = new THREE.MeshStandardMaterial({
                map: map,
                side: THREE.DoubleSide
            });
        }
        else if (mode === 'HeatMap') {
            overrideMat = this.createHeatShader();
        }

        // Apply
        this.engine.traverse((child) => {
            if (child.isMesh) {
                // If STANDARD, restore original
                if (mode === 'Standard') {
                    if (this.originalMaterials.has(child.uuid)) {
                        const data = this.originalMaterials.get(child.uuid);
                        // We must NOT simply clone the stored one to overwrite, because we want the REFERENCE back
                        // But wait, we didn't store the reference, we stored properties!
                        // Actually, SceneManager might be updating 'emissive' on the LIVE material.
                        // If we replaced the live material with an override, the LIVE reference is gone from the mesh.
                        // So we need to store the ORIGINAL MATERIAL INSTANCE if we want to restore it perfectly?
                        // YES. 

                        // Let's check `init()`: I stored properties, not the instance. That's a mistake for restoration.
                        // Wait, I can't easily restore if I didn't save the instance.
                        // But I need to respect the original `init` logic.

                        // RE-LOGIC:
                        // I will update `init` to store the material INSTANCE.
                    }
                } else {
                    // Apply Override
                    // Clone it so we don't link all meshes to single instance (unless shader)
                    // Allows per-object clipping?
                    // Actually sharing instance is better for performance if uniform.
                    // But UV mapping might need separate? No.

                    // Special case: FlameShader/Particles should NOT be overridden?
                    // They are Auxiliaries, usually not children of 'engine' group (except Nacelle?)
                    // Engine group has: Components, Nacelle.
                    // Nacelle should obey mode? Yes.

                    if (child.name === 'NacelleMesh' && mode !== 'Wireframe') {
                        // Keep Nacelle transparent in Clay/Metallic? 
                        // Maybe. For now override all.
                    }

                    child.material = overrideMat;
                }
            }
        });

        // Handling Restoration in 'Standard' mode requires saving instances.
        if (mode === 'Standard') {
            this.restoreOriginalMaterials();
        }
    }

    restoreOriginalMaterials() {
        this.engine.traverse((child) => {
            if (child.isMesh && this.originalMatInstances && this.originalMatInstances.has(child.uuid)) {
                child.material = this.originalMatInstances.get(child.uuid);
            }
        });
    }

    // ============================================
    // SECTION CUT (Clipping)
    // ============================================
    setSectionCut(active) {
        if (!this.clippingPlane) {
            // Cut along Z axis (Front/Back) or Y (Top/Bottom)?
            // Engine is along X. 
            // Usually Section Cut is along Z plane (showing side profile)
            // Plane normal (0, 0, 1) cuts the Z-axis. 
            // Coping half the engine.

            this.clippingPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
        }

        // Apply global clipping logic
        // We set the material.clippingPlanes property for ALL meshes

        const planes = active ? [this.clippingPlane] : [];

        this.engine.traverse((child) => {
            if (child.isMesh) {
                // If material is array, handle it
                const mats = Array.isArray(child.material) ? child.material : [child.material];

                mats.forEach(m => {
                    m.clippingPlanes = planes;
                    m.clipShadows = true;
                });
            }
        });

        if (this.renderer) {
            this.renderer.localClippingEnabled = true; // Ensure global flag is ON
        }
    }

    setSectionCutPosition(val) {
        if (this.clippingPlane) {
            this.clippingPlane.constant = val;
        }
    }

    update(dt) {
        // Update Shader Uniforms
        if (this.heatShader && this.physics && this.physics.stations) {
            this.heatShader.uniforms.uT2.value = this.physics.stations[2].T;
            this.heatShader.uniforms.uT3.value = this.physics.stations[3].T;
            this.heatShader.uniforms.uT4.value = this.physics.stations[4].T;
            this.heatShader.uniforms.uT5.value = this.physics.stations[5].T;
        }

        // Animation Logic
        const speed = 5.0 * dt;

        // 1. Global Engine Explosion
        this.engine.children.forEach((child, index) => {
            if (child.name === "Nacelle") {
                // Special Case: Move Nacelle UP instead of breaking it apart
                let targetY = 0; // Original Y (0)
                if (this.isExploded) {
                    targetY = 2.0; // Move Up
                }
                child.position.y += (targetY - child.position.y) * speed;
                return; // Skip standard linear explosion
            }

            let targetX = this.originalX.get(child.uuid);
            if (targetX === undefined) targetX = child.position.x; // Fallback

            // Use 'index' is risky if mixed with Nacelle? 
            // Better to rely on the stored sorted index or just filter Nacelle out of the loop logic?
            // Since we RETURN above, the index still increments for the loop, so the gaps remain consistent
            // for the other components.

            if (this.isExploded) {
                targetX += index * this.explosionGap;
            }

            if (!isNaN(targetX)) {
                child.position.x += (targetX - child.position.x) * speed;
            }
        });

        // 2. Sub-Component Explosion (Custom Logic)
        if (this.explodedComponent && this.subOriginalPos) {

            let statorIndex = 0;
            let rotorIndex = 0;

            // Traverse direct children
            this.explodedComponent.children.forEach((child) => {
                const orig = this.subOriginalPos.get(child.uuid);
                if (!orig) return; // Should not happen

                let target = orig.clone();

                // Logic based on Name / Type
                if (child.name.includes("Casing")) {
                    // Move UP (Y Axis)
                    target.y += 2.0;
                }
                else if (child.name.includes("Stator")) {
                    // Spread Left (X-)
                    statorIndex++;
                    target.y += 1.5;
                    // CRITICAL: Increase multiplier to prevent visual merging
                    target.x -= (statorIndex * 2.5);
                }
                else if (child.name === "Spinner") {
                    target.x -= 2.0; // Move forward
                }
                else if (child.name === "RotorGroup") {
                    // This group contains the rotors. 
                    // We need to animate ITS children too?
                    // Or move the whole group?
                    // Let's move the group Right?
                    // target.x += 1.0; 

                    // Animate Internal Rotors
                    let rIdx = 0;
                    child.children.forEach(rotorStage => {
                        const rOrig = this.subOriginalPos.get(rotorStage.uuid);
                        if (rOrig) {
                            // Spread Rotors Right
                            let rTarget = rOrig.clone();
                            if (rotorStage.name.includes("Rotor")) {
                                rIdx++;
                                rTarget.x += (rIdx * 0.6);
                            }
                            rotorStage.position.lerp(rTarget, speed);
                        }
                    });
                }

                // Apply Lerp to direct child
                child.position.lerp(target, speed);
            });
        }
    }

    // 3. Restore non-exploded sub-components?
    // If we switched away, we need to move the OLD exploded component back.
    // But we lost reference in `resetSubExplosion` -> `explodedComponent = null`.
    // We need a persistent state or check all?
    // Ideal: When we reset, we set a target flag? 
    // Hack: We can just iterate the `subOriginalX` map if we keep it? 
    // But the map belongs to the `explodedComponent`. 

    // Better Loop: 
    // Iterate ALL components. If they have saved `subOriginalX` but are NOT the current `explodedComponent`, reset them.
    // 3. Restore non-exploded sub-components?
    restoreSubPositions() {
        this.resetSubExplosion();
    }

    // Allow InteractionManager to override positions during Drag
    overrideSubPosition(obj, newPos) {
        if (this.subOriginalPos) {
            // We update the stored "Original" (which is actually the target for the Lerp)
            // But wait, the Update loop calculates target = Original + Offset.
            // If we want to place it EXACTLY at newPos, we need to reverse the math or just set it.
            // Easiest: Update the `subOriginalPos` to be `newPos - Offset`.
            // But Offset depends on index/type.
            // Hack: Just update the `subOriginalPos` to `newPos` and assume logic handles it?
            // Actually, if the user drags it, they define the NEW target.
            this.subOriginalPos.set(obj.uuid, newPos.clone());
            // This effectively makes the current dragged position the new "Home".
        }
    }
}
