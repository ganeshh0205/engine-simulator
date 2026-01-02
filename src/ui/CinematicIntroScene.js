import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { EngineFactory } from "../engines/EngineFactory.js";
import { Nacelle } from "../components/Nacelle.js";
import { PhysicsEngine } from "../core/PhysicsEngine.js";

export class CinematicIntroScene {
    constructor(container, data) {
        this.container = container;
        this.data = data;
        this.narrativeLines = data.narrative || [];
        this.totalDuration = data.duration || 12000;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.engine = null;
        this.particle = null;

        // Physics for Realism - "Proper Working Conditions"
        this.physics = new PhysicsEngine();
        this.physics.inputs.throttle = 80.0; // High Idle / Cruise Power for nice glow
        this.lastTime = performance.now();

        this.stars = null;

        this.startTime = Date.now();
        this.animationId = null;

        this.overlay = null;

        this.init();
    }

    init() {
        // 1. Setup Three.js Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505); // Match Lab

        // 2. Camera (The "Particle" Viewpoint initially)
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 5);

        // 3. Renderer - Copying High Quality Settings from SceneManager
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);

        // 3b. Post Processing
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.container.clientWidth, this.container.clientHeight), 0.4, 0.2, 0.95);
        this.composer.addPass(bloomPass);

        // 4. Lighting - Exact Replica of SceneManager
        // Ambient
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        // Key Light
        const keyLight = new THREE.DirectionalLight(0xfffaed, 2.0);
        keyLight.position.set(10, 10, 5);
        this.scene.add(keyLight);

        // Rim Light
        const rimLight = new THREE.SpotLight(0x4455ff, 5.0);
        rimLight.position.set(-5, 5, -20); // Tweaked slightly for better rim on intake
        rimLight.lookAt(0, 0, 0);
        this.scene.add(rimLight);

        // Bottom Fill
        const bottomLight = new THREE.DirectionalLight(0x222222, 1.0);
        bottomLight.position.set(0, -10, 0);
        this.scene.add(bottomLight);

        // 5. The Engine
        this.engine = EngineFactory.createTurbojet();
        this.engine.rotation.y = -Math.PI / 2;

        // Add Nacelle (Critical)
        this.nacelle = new Nacelle({ length: 4.8, radius: 1.15, opacity: 0.15 });
        this.engine.add(this.nacelle);

        // Start Position
        this.engine.position.set(0, -2, -60);
        this.scene.add(this.engine);

        // Context: Grid
        const grid = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
        grid.position.y = -2.0;
        this.scene.add(grid);

        // 6. The "Particle" (Camera Self)
        const particleGeo = new THREE.SphereGeometry(0.05, 16, 16);
        const particleMat = new THREE.MeshBasicMaterial({ color: 0x63b3ed, transparent: true, opacity: 0.8 });
        this.particle = new THREE.Mesh(particleGeo, particleMat);
        this.particle.position.set(0, -0.2, -1);
        this.scene.add(this.particle);

        // 7. Handle Resize
        window.addEventListener('resize', this.onResize.bind(this));

        this.currentStep = 0;
        this.targetZ = -60; // Initial Depth

        // Narrative Mapping
        // Steps 0-4: Idle (-60)
        // Step 5: "And suddenly" -> Start Approach (-60)
        // Step 6: "Approaches you..." -> Mid Approach (-30)
        // Step 7: "Pulled in" -> Capture (-2)
        // Step 8: "Journey begins" -> Inside (2)

        this.createUI();
        this.updateStep();
        this.animate();
    }

    createUI() {
        // Overlay Text - Moved to Bottom
        this.overlay = document.createElement("div");
        Object.assign(this.overlay.style, {
            position: "absolute", bottom: "20%", left: "50%", transform: "translate(-50%, 0)",
            color: "white", fontSize: "1.8rem", fontWeight: "300",
            textShadow: "0 2px 10px rgba(0,0,0,0.9)", textAlign: "center", width: "80%",
            fontFamily: "'Inter', sans-serif", transition: "opacity 0.5s"
        });
        this.container.appendChild(this.overlay);

        // Next Button
        this.nextBtn = document.createElement("button");
        this.nextBtn.innerText = "CONTINUE";
        Object.assign(this.nextBtn.style, {
            position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)",
            padding: "12px 30px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.4)",
            color: "white", borderRadius: "30px", fontSize: "0.9rem", cursor: "pointer",
            backdropFilter: "blur(5px)", transition: "all 0.2s", letterSpacing: "2px", fontWeight: "bold"
        });

        this.nextBtn.onmouseover = () => { this.nextBtn.style.background = "rgba(255,255,255,0.25)"; };
        this.nextBtn.onmouseout = () => { this.nextBtn.style.background = "rgba(255,255,255,0.1)"; };
        this.nextBtn.onclick = () => this.advanceStep();

        this.container.appendChild(this.nextBtn);
    }

    advanceStep() {
        if (this.currentStep < this.narrativeLines.length - 1) {
            this.currentStep++;
            this.updateStep();
        } else {
            // End of Intro
            this.nextBtn.style.display = "none";
            this.overlay.innerText = "";
        }
    }

    updateStep() {
        // 1. Update Text
        const text = this.narrativeLines[this.currentStep];
        this.overlay.style.opacity = "0";
        setTimeout(() => {
            this.overlay.innerText = text;
            this.overlay.style.opacity = "1";
        }, 300);

        // 2. Set Animation Targets based on content
        if (this.currentStep < 5) {
            this.targetZ = -60; // Idle
        } else if (this.currentStep === 5) {
            this.targetZ = -40; // Moving closer
        } else if (this.currentStep === 6) {
            this.targetZ = -15; // Rapid approach
        } else if (this.currentStep === 7) {
            this.targetZ = -2; // Captured
        } else if (this.currentStep === 8) {
            this.targetZ = 2.0; // Inside
        }
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));

        // Physics Loop Time
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // Narrative Time
        const realTimeElapsed = Date.now() - this.startTime;

        // 1. Physics Update
        this.physics.update(dt);
        const currentRPM = this.physics.state.rpm;

        // 2. Heat Rendering Helpers (Replicated)
        const t4 = this.physics.stations[4].T;
        const t5 = this.physics.stations[5].T;

        // Blackbody Glow Helper
        const getHeatColor = (temp, outputColor) => {
            const color = outputColor || new THREE.Color(0x000000);
            if (temp < 773) { color.setRGB(0, 0, 0); return color; }
            const t = THREE.MathUtils.clamp((temp - 800) / 1200, 0, 1);
            let r = THREE.MathUtils.smoothstep(t, 0.0, 0.3) * 1.5;
            let g = THREE.MathUtils.smoothstep(t, 0.2, 0.7) * 0.8;
            let b = THREE.MathUtils.smoothstep(t, 0.6, 1.0) * 0.6;
            color.setRGB(Math.min(r, 1.0), Math.min(g, 1.0), Math.min(b, 1.0));
            return color;
        };
        const combustorGlow = getHeatColor(t4);
        const turbineGlow = getHeatColor(t5);

        // 3. Engine Visual Updates
        if (this.engine) {
            this.engine.traverse((obj) => {
                // RPM Drive
                if (obj.name === "Compressor" || obj.name === "Turbine") {
                    obj.params.rpm = (currentRPM / 100) * 8000;
                }

                // Heat Glow
                if (obj.name === "Combustor") {
                    if (obj.linerMats) obj.linerMats.forEach(mat => mat.emissive.copy(combustorGlow));
                    else if (obj.linerMat) obj.linerMat.emissive.copy(combustorGlow);
                }
                if (obj.name === "Turbine" && obj.rotorMat) {
                    obj.rotorMat.emissive.copy(turbineGlow);
                }
                if (obj.name === "Nozzle" && obj.coneMat) {
                    obj.coneMat.emissive.copy(getHeatColor(t5));
                }

                // Physics Components Update
                if (typeof obj.update === "function") {
                    obj.update(dt, this.physics);
                }
            });
        }

        // 4. Cinematic Position Logic
        const speed = 0.02;
        this.engine.position.z += (this.targetZ - this.engine.position.z) * speed;

        // 5. Continuous Idle Motion
        this.particle.position.x = Math.sin(realTimeElapsed * 0.001) * 0.05;
        this.particle.position.y = Math.cos(realTimeElapsed * 0.0015) * 0.05 - 0.2;

        this.engine.rotation.z = Math.sin(realTimeElapsed * 0.0002) * 0.02; // Subtle Sway

        // 6. Camera Shake
        if (this.currentStep >= 5 && this.currentStep <= 7) {
            this.camera.position.x = (Math.random() - 0.5) * 0.05;
            this.camera.position.y = (Math.random() - 0.5) * 0.05;
        } else {
            this.camera.position.x *= 0.9;
            this.camera.position.y *= 0.9;
        }

        this.composer.render();
    }

    dispose() {
        window.removeEventListener('resize', this.onResize);
        cancelAnimationFrame(this.animationId);
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
