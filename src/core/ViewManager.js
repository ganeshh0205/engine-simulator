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
            if (aux.name === 'VolumetricFlow') {
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

        // Engineering Blue/Grid aesthetics
        // Background: Dark Blueprint (#001a33) -> RGB(0, 26, 51)
        // Grid Lines: Cyan/White (#00ffff) -> RGB(0, 255, 255)

        const rbg = 10, gbg = 15, bbg = 30; // Dark Blue Grey Background
        const rline = 0, gline = 100, bline = 200; // Cyan-ish Grid

        for (let i = 0; i < size; i++) {
            const stride = i * 4;
            const x = i % width;
            const y = Math.floor(i / width);

            // Grid Lines every 64 pixels (Major), 16 (Minor)
            const isMajor = (x % 64 === 0 || y % 64 === 0);
            const isMinor = (x % 16 === 0 || y % 16 === 0);

            if (isMajor) {
                // Bright Line
                data[stride] = rline;
                data[stride + 1] = gline + 55;
                data[stride + 2] = bline + 55;
                data[stride + 3] = 255;
            } else if (isMinor) {
                // Faint Line
                data[stride] = rline;
                data[stride + 1] = gline;
                data[stride + 2] = bline;
                data[stride + 3] = 255;
            } else {
                // Background
                data[stride] = rbg;
                data[stride + 1] = gbg;
                data[stride + 2] = bbg;
                data[stride + 3] = 255;
            }
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

        // Fragment Shader: Blackbody Radiation approximation
        const fs = `
            uniform float uT2; // Inlet
            uniform float uT3; // Compressor Exit
            uniform float uT4; // Combustor Exit
            uniform float uT5; // Turbine Exit
            uniform float uTime; // For heat shimmer
            
            varying vec3 vWorldPos;
            varying vec3 vNormal;
            
            // gradient noise for shimmer
            float hash( float n ) { return fract(sin(n)*43758.5453123); }
            float noise( in vec3 x ){
                vec3 p = floor(x);
                vec3 f = fract(x);
                f = f*f*(3.0-2.0*f);
                float n = p.x + p.y*57.0 + 113.0*p.z;
                return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                               mix( hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
                           mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                               mix( hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
            }

            // Blackbody Color Ramp (Physics based visual)
            vec3 getBlackBodyColor(float temp) {
                // Smooth transition from Cold Metal to Hot Glow
                // Start showing heat around 500K (faint deep red) to 1400K (White)
                
                // GLOW THRESHOLD FIX: Increase start to 800K to keep Compressor (approx 600K) cool.
                float t = clamp((temp - 800.0) / 800.0, 0.0, 1.0); 
                
                // Base Metal (Cool)
                // Distinct Blue for Cold/Inlet -> Fades to Grey -> then Glows
                vec3 cColdBlue = vec3(0.0, 0.2, 0.8); // Strong Blue for inlet
                vec3 cGrey = vec3(0.1, 0.1, 0.1);     // Standard Metal

                // Heat Gradient stops
                vec3 cRed = vec3(0.8, 0.05, 0.0);
                vec3 cOrange = vec3(1.0, 0.4, 0.0);
                vec3 cYellow = vec3(1.0, 0.9, 0.2);
                vec3 cWhite = vec3(1.0, 1.0, 1.0);
                
                vec3 glow = vec3(0.0);
                
                // Non-linear ramp for realistic "incandescence"
                // It really picks up after 800K
                if (t < 0.25) glow = mix(vec3(0.0), cRed, t / 0.25);
                else if (t < 0.5) glow = mix(cRed, cOrange, (t - 0.25) / 0.25);
                else if (t < 0.75) glow = mix(cOrange, cYellow, (t - 0.5) / 0.25);
                else glow = mix(cYellow, cWhite, (t - 0.75) / 0.25);

                // Mix Cold and Glow based on temp
                // At low temp, mostly Metal. At high temp, Metal is overwhelmed.
                
                // Cold Logic: 300K -> Blue, 800K -> Grey
                // ADJUSTMENT: Keep it blue longer (up to 500K) to avoid "major change" at idle
                float coldT = clamp((temp - 500.0) / 500.0, 0.0, 1.0);
                vec3 baseColor = mix(cColdBlue, cGrey, coldT);

                float glowStrength = t * t * t; // Cubic curve for emission
                return mix(baseColor, glow, clamp(t * 1.5, 0.0, 1.0));
            }

            void main() {
                 float x = vWorldPos.x;
                 
                 // Smooth Gradient Multi-Stop Interpolation
                 // Points: X=0(Inlet), 4(Comp), 6(Comb), 8.5(Turb), 11(Noz)
                 
                 float t2_pos = 1.0;
                 float t3_pos = 4.6;
                 float t4_pos = 6.6;
                 float t5_pos = 9.0;
                 
                 float localT = uT2;
                 
                 // Smooth Hermite interpolation or Linear? Linear is predictable.
                 // We calculate weights for each segment.
                 
                 if (x < t2_pos) {
                     localT = uT2;
                 } else if (x < t3_pos) {
                     float f = (x - t2_pos) / (t3_pos - t2_pos);
                     localT = mix(uT2, uT3, f);
                 } else if (x < t4_pos) {
                     float f = (x - t3_pos) / (t4_pos - t3_pos);
                     localT = mix(uT3, uT4, f);
                 } else if (x < t5_pos) {
                     float f = (x - t4_pos) / (t5_pos - t4_pos);
                     localT = mix(uT4, uT5, f);
                 } else {
                     localT = uT5;
                 }
                 
                 // Add subtle noise shimmer to temperature to simulate turbulent convection
                 float shimmer = noise(vWorldPos * 2.0 + vec3(uTime * 2.0, 0.0, 0.0)) * 0.05;
                 // Only shimmer if hot
                 if (localT > 600.0) localT += localT * shimmer;

                 vec3 color = getBlackBodyColor(localT);
                 
                 // Fake Rim Lighting for 3D volume feel
                 vec3 viewDir = normalize(cameraPosition - vWorldPos);
                 float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
                 rim = pow(rim, 3.0);
                 
                 // Lighting
                 vec3 light = normalize(vec3(0.5, 1.0, 0.5));
                 float diff = max(dot(vNormal, light), 0.3);
                 
                 // Combine: Color * Diffuse + Glow + Rim
                 // If hot, Diffuse matters less, Glow matters more
                 float heatFactor = clamp((localT - 600.0)/800.0, 0.0, 1.0);
                 
                 vec3 finalColor = mix(color * diff, color, heatFactor * 0.9);
                 finalColor += vec3(0.2, 0.1, 0.0) * rim * heatFactor; // Red rim light when hot

                 gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        this.heatShader = new THREE.ShaderMaterial({
            uniforms: {
                uT2: { value: 300.0 },
                uT3: { value: 400.0 },
                uT4: { value: 1000.0 },
                uT5: { value: 800.0 },
                uTime: { value: 0.0 }
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

                    // CRITICAL FIX: Do NOT override FX materials (Flames have specific uniforms)
                    if (child.name === 'CombustionFlames' ||
                        child.name === 'FuelSpray' ||
                        child.isPoints ||
                        child.isSprite) {
                        return;
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
            this.heatShader.uniforms.uTime.value += dt; // ANIMATION FIX
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
                    // Reduced multiplier from 2.5 to 1.0 for closer packing
                    target.x -= (statorIndex * 1.0);
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
