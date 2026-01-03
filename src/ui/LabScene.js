import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { EngineFactory } from "../engines/EngineFactory.js";
import { PhysicsEngine } from "../core/PhysicsEngine.js";
import { Nacelle } from "../components/Nacelle.js";

export class LabScene {
    constructor(container, data) {
        this.container = container;
        this.data = data;
        this.scenario = data.scenario || "intro_particle"; // 'intro_particle', 'intake', 'compressor'

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Scene Objects
        this.engine = null;
        this.nacelle = null;
        this.atmosphereGroup = null;
        this.heroParticle = null;
        this.flowParticles = null; // For Intake flow viz

        // State
        this.currentScene = 0;
        this.sceneTime = 0;
        this.simState = { airflow: false, fuel: false, ignition: false };
        this.surpriseState = false;

        // Hero Particle State (Compressor & General)
        this.heroState = {
            phase: "idle",   // idle | stalled | stage1 | lpc_transit | lpc_end | hpc | exit
            theta: 0,
            heat: 0.0,       // 0 -> 1
            stageIndex: 0,   // For tracking blade-by-blade progress
            spinProgress: 0, // Accumulator for "one full spin" check
        };

        // Debug State
        this.lastClickPos = null;

        // Physics
        this.physics = new PhysicsEngine();
        this.physics.inputs.throttle = 0.0;

        this.animationId = null;
        this.lastTime = performance.now();

        // Bindings
        this.onMouseDownBound = this.onMouseDown.bind(this);
        this.onMouseUpBound = this.onMouseUp.bind(this);

        // Delay init slightly to ensure container has size
        requestAnimationFrame(() => this.init());
    }

    init() {
        const width = this.container.clientWidth || 800;
        const height = this.container.clientHeight || 600;

        // 1. Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 0, 10);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.physicallyCorrectLights = true;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.domElement.style.outline = "none";
        this.container.appendChild(this.renderer.domElement);

        // 4. Post-Processing
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.4, 0.2, 0.95);
        this.composer.addPass(bloomPass);

        // 5. Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 3;
        this.controls.maxDistance = 80;
        this.controls.enablePan = false;

        // 6. Lighting
        this.addLights();

        // 7. Setup Scenes (Geometry)
        this.setupAtmosphereScene();
        this.setupLabScene();
        if (this.scenario === "intake" || this.scenario === "compressor") {
            this.setupIntakeViz(); // Reuse particle system for compressor flow too (will reset positions)
        }

        // 8. UI
        // Widgets replaced by ControlPanel
        // this.createTextWidget();
        // this.createDebugWidget();

        // Events
        this.renderer.domElement.addEventListener('mousedown', this.onMouseDownBound);
        this.renderer.domElement.addEventListener('mouseup', this.onMouseUpBound);
        window.addEventListener('resize', this.onResize.bind(this));

        // Initial State
        this.switchScene(0);

        // Start Loop
        this.generateCompressorMap();
        this.animate();
    }

    setupIntakeViz() {
        // Additional particles for flow visualization
        const geom = new THREE.BufferGeometry();
        const count = 500; // Increased density for effect
        const pos = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const userData = []; // Store offsets/speeds per particle
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 5;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 5;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;

            // Init Color (Blueish)
            colors[i * 3] = 0.6; // R
            colors[i * 3 + 1] = 0.8; // G
            colors[i * 3 + 2] = 1.0; // B

            userData.push({
                speed: 5 + Math.random() * 5,
                offset: Math.random() * 100,
                radius: 0.6 + Math.random() * 0.4, // Pre-safe radius
                angle: Math.random() * Math.PI * 2,
                // STATE FOR HERO-LIKE LOGIC
                stageIndex: 0,
                spinProgress: 0,
                isSpinning: false
            });
        }
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.08,
            transparent: true,
            opacity: 0.7,
            vertexColors: true, // ENABLE PER-PARTICLE COLOR
            blending: THREE.AdditiveBlending
        });
        this.flowParticles = new THREE.Points(geom, mat);
        this.flowParticles.userData = { config: userData };
        this.scene.add(this.flowParticles);
        this.flowParticles.visible = false;
    }

    generateCompressorMap() {
        // CALCULATED Z-POSITIONS FOR COMPRESSOR BLADES
        // CORRECTED: Flow is +Z. Engine Starts at 0 (Intake) -> 1.1 (Comp Face).
        // Compressor Local X increases in +Z direction.

        const offset = 1.1;
        const stages = { LPC: [], HPC: [] };

        // LPC: 4 Stages, Spacing 0.5
        for (let i = 1; i <= 4; i++) {
            const idx = i - 1;
            const rLocal = idx * 0.5 + 0.1;
            const sLocal = rLocal + 0.25;

            stages.LPC.push({ id: `${i}r`, type: 'rotor', z: offset + rLocal });
            stages.LPC.push({ id: `${i}s`, type: 'stator', z: offset + sLocal });
        }

        // HPC: 10 Stages, Spacing 0.25
        const hpcStart = 2.5;
        for (let i = 1; i <= 10; i++) {
            const idx = i - 1;
            const rLocal = hpcStart + idx * 0.25 + 0.05;
            const sLocal = rLocal + 0.125;

            stages.HPC.push({ id: `${i}r`, type: 'rotor', z: offset + rLocal });
            stages.HPC.push({ id: `${i}s`, type: 'stator', z: offset + sLocal });
        }

        this.compressorData = stages;
        // Flatten for easy particle lookup
        this.allStages = [...stages.LPC, ...stages.HPC].sort((a, b) => a.z - b.z);
        return stages;
    }

    onMouseDown(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            this.measureStart = intersects[0].point;
            this.measureStartName = intersects[0].object.name;
        } else {
            this.measureStart = null;
        }
    }

    onMouseUp(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const p = intersects[0].point;
            let text = `Hit: ${intersects[0].object.name} @ (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;

            if (this.measureStart) {
                const dist = this.measureStart.distanceTo(p);
                // Detect Click vs Drag
                if (dist > 0.05) {
                    text += `\nDist: ${dist.toFixed(4)}`;
                    console.log(`Measured: ${dist.toFixed(4)}m from ${this.measureStartName} to ${intersects[0].object.name}`);
                }
            }

            this.lastClickPos = text;
            console.log(text);
        }
    }

    setupAtmosphereScene() {
        this.atmosphereGroup = new THREE.Group();
        const particlesGeo = new THREE.BufferGeometry();
        const count = 1000;
        const pos = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 50;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
            sizes[i] = Math.random();
        }
        particlesGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        particlesGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        const particlesMat = new THREE.PointsMaterial({
            color: 0x88ccff, size: 0.05, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending
        });
        const particles = new THREE.Points(particlesGeo, particlesMat);
        this.atmosphereGroup.add(particles);

        // HERO Particle
        const heroGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const heroMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9, depthTest: true });
        this.heroParticle = new THREE.Mesh(heroGeo, heroMat);
        // this.heroParticle.renderOrder = 999; // REMOVED: Allow Z-Buffering for occlusion
        // this.atmosphereGroup.add(this.heroParticle); // OLD
        this.scene.add(this.heroParticle); // NEW: Independent control
        this.scene.add(this.atmosphereGroup);
    }

    setupLabScene() {
        this.engine = EngineFactory.createTurbojet();
        this.engine.rotation.y = -Math.PI / 2;
        this.nacelle = new Nacelle({ length: 4.8, radius: 1.15, opacity: 0.1 });
        this.engine.add(this.nacelle);
        this.scene.add(this.engine);
        this.engine.visible = false;
    }

    isolateComponent(visibleNames) {
        if (!this.engine) return;
        this.engine.visible = true;
        this.engine.traverse((child) => {
            // Keep Nacelle components always if visibleNames includes "Nacelle"
            if (child.isMesh) {
                let show = false;
                // Allow parent check
                let parent = child.parent;
                while (parent && parent !== this.engine) {
                    if (visibleNames.includes(parent.name)) show = true;
                    parent = parent.parent;
                }
                // Check direct name or "Nacelle" if applicable
                if (visibleNames.includes(child.name)) show = true;
                if (visibleNames.includes("Nacelle") && this.nacelle.children.includes(child)) show = true;

                // Hack for EngineFactory names
                if (visibleNames.includes("Intake") && (child.name.includes("Inlet") || child.parent?.name.includes("Inlet"))) show = true;

                child.visible = show;
            }
        });
    }

    switchScene(index) {
        this.currentScene = index;
        this.sceneTime = 0;
        this.surpriseState = false;

        if (this.scenario === "intake") {
            this.handleIntakeScene(index);
        } else if (this.scenario === "compressor") {
            this.handleCompressorScene(index);
        } else if (this.scenario === "combustion") {
            this.handleCombustionScene(index);
        } else if (this.scenario === "turbine") {
            this.handleTurbineScene(index);
        } else if (this.scenario === "nozzle") {
            this.handleNozzleScene(index);
        } else {
            this.handleIntroScene(index);
        }
    }

    handleIntroScene(index) {
        // Original logic for Scenario 1
        if (index === 0) {
            this.engine.visible = false;
            this.atmosphereGroup.visible = true;
            this.camera.position.set(0, 0, 8);
            this.controls.enableRotate = true; this.controls.enablePan = true;
            this.controls.target.set(0, 0, 0);
            this.heroParticle.visible = true;
            this.heroParticle.position.set(0, 0, 0);
            this.updateTextContent("Let’s stop thinking like engineers...", "Imagine you are a tiny air particle...", "CONTINUE");
        }
        else if (index === 1) {
            this.engine.visible = false; this.engine.position.z = -50; this.engine.rotation.y = 0;
            this.atmosphereGroup.visible = true;
            this.camera.position.set(0, 0, 8); this.controls.enablePan = true;
            this.heroParticle.visible = true; this.heroParticle.position.set(0, 0, 0);
            this.updateTextContent("And suddenly —", "Wait for it...", null);
        }
        else if (index === 2) {
            this.engine.visible = true; this.engine.position.set(0, 0, 0); this.engine.rotation.y = -Math.PI / 2;
            this.camera.position.set(-1.7, 1.0, -4.6); this.controls.target.set(0, 0, 0);
            this.controls.enablePan = true; this.controls.enableRotate = true;
            this.heroParticle.visible = true; this.heroParticle.position.set(-0.07, 0.61, 0.07);
            this.updateTextContent("Inside the Engine", "You have been sucked in.", null);
        }
    }

    handleIntakeScene(index) {
        // Start fresh visuals
        this.atmosphereGroup.visible = false;
        this.engine.visible = true;
        this.heroParticle.visible = false;
        if (this.flowParticles) this.flowParticles.visible = false;

        // GLOBAL SETTINGS FOR MODULE
        this.controls.enableRotate = true;
        this.controls.enablePan = true;
        const DEFAULT_CAM = new THREE.Vector3(8.1, 3.3, 15.6);

        // Global Component Isolation
        this.isolateComponent(["Intake", "Nacelle", "Inlet"]);
        this.nacelle.rotation.y = 0;

        // Apply default cam first (Scenes 1-3)
        this.camera.position.copy(DEFAULT_CAM);
        this.controls.target.set(0, 0, 0);

        // 1. Misconception (Scene 1)
        if (index === 0) {
            this.engine.visible = false;
            this.heroParticle.visible = true;
            this.heroParticle.scale.set(1.5, 1.5, 1.5);
            this.heroParticle.position.set(2.75, 1.13, 6.12);
            this.updateTextContent("Scene 1 — The Misconception", 'People say: "You get sucked into the engine."<br/>Pause.<br/>That’s not what really happens.', "NEXT");
        }

        // 2. What an Intake Really Is (Scene 2)
        if (index === 1) {
            this.isolateComponent(["Intake", "Inlet"]);
            this.heroParticle.visible = true;
            this.heroParticle.scale.set(1.5, 1.5, 1.5);
            this.heroParticle.position.set(2.75, 1.13, 6.12);
            this.updateTextContent("Scene 2 — What an Intake Really Is", "This opening isn’t just a hole. It’s a carefully shaped intake.<br/>Its job is control.", "NEXT");
        }

        // 3. Problem with Fast Air (Scene 3)
        if (index === 2) {
            this.isolateComponent(["Intake", "Nacelle", "Inlet"]);
            this.flowParticles.visible = true;
            // Uses Default Cam (8.1, 3.3, 15.6)
            this.updateTextContent("Scene 3 — The Problem with Fast Air", "Outside, air is fast, turbulent, chaotic.<br/>Compressors can’t work with chaos.", "NEXT");
        }

        // 4. What Intake Does (Scene 4)
        if (index === 3) {
            this.isolateComponent(["Intake", "Nacelle", "Inlet"]);
            this.camera.position.set(-2.7, 1.2, -4.6); // USER COORD
            this.flowParticles.visible = true;
            this.updateTextContent("Scene 4 — What the Intake Does", "The air is not accelerated. It is slowed down.<br/>Smoothly. Gradually.", "NEXT");
        }

        // 5. The Trade (Scene 5)
        if (index === 4) {
            this.isolateComponent(["Intake", "Nacelle", "Inlet"]);
            this.camera.position.set(-5.3, -0.3, -5.7); // USER COORD
            this.flowParticles.visible = true;
            this.updateTextContent("Scene 5 — The Trade", "When speed goes down... Pressure increases.<br/>No moving parts. Just physics.", "NEXT");
        }

        // 6. Flow Control (Scene 6)
        if (index === 5) {
            this.isolateComponent(["Intake", "Nacelle", "Inlet"]);
            this.camera.position.set(-4.4, 0.5, -4.4); // USER COORD
            this.flowParticles.visible = true;
            this.updateTextContent("Scene 6 — Flow Control", "The airflow must be Straight, Even, Uniform.<br/>No swirls. No separation.", "NEXT");
        }

        // 7. Why This Matters (Scene 7)
        if (index === 6) {
            this.isolateComponent(["Intake", "Nacelle", "Inlet"]);
            this.camera.position.set(-4.4, 0.5, -4.4); // USER COORD
            this.flowParticles.visible = true;
            this.updateTextContent("Scene 7 — Why This Matters", "If intake fails: Compressor stall. Engine surge.<br/>The intake is silent but protects everything.", "NEXT");
        }

        // 8. True Purpose (Scene 8)
        if (index === 7) {
            this.isolateComponent(["Intake", "Nacelle", "Inlet"]);
            this.camera.position.set(-4.4, 0.5, -4.4); // USER COORD
            this.flowParticles.visible = true;
            this.updateTextContent("Scene 8 — The Intake’s True Purpose", "It is a translator.<br/>Takes fast, chaotic air and turns it into calm, pressurized flow.", "NEXT");
        }

        // 9. The Question (Scene 9)
        if (index === 8) {
            this.isolateComponent(["Intake", "Nacelle", "Inlet"]);
            this.camera.position.set(-4.4, 0.5, -4.4); // USER COORD
            this.updateTextContent("Scene 9 — The Question", "Once the air is calm... What happens next?<br/>", "FINISH");
        }
    }

    handleCompressorScene(index) {
        // Reset Visuals
        this.atmosphereGroup.visible = false;
        this.engine.visible = true;
        this.engine.rotation.y = -Math.PI / 2; // Align with Z for correct flow
        // Hero visibility handled by animate loop
        if (this.flowParticles) {
            this.flowParticles.visible = true;
        }

        // Global Module Settings
        this.controls.enableRotate = true;
        this.controls.enablePan = true;

        // FIXED CAM ANGLE
        this.camera.position.set(-6.5, 1.8, 0.3);
        this.controls.target.set(3, 0, 0);

        this.isolateComponent(["Compressor", "Shaft", "Spinner"]);

        // Hide Casing to show inner blades (User Request)
        const casing = this.engine.getObjectByName("CompressorCasing");
        if (casing) casing.visible = false;

        // --- HERO STATE LOGIC ---
        // Scene 1: Intake Face (0.00m)
        if (index === 0) this.heroState.phase = "idle";

        // Scene 2: First Blade (0.10m inside -> Z=1.20)
        if (index === 1) this.heroState.phase = "stage1";

        // Scene 3: Whirl through LPC
        if (index === 2) {
            this.heroState.phase = "lpc_transit";
            this.heroState.stageIndex = 1; // Start moving to Stator 1 (next after Rotor 1)
            this.heroState.spinProgress = 0;
        }

        // Scene 4: Move to HPC and continue
        if (index === 3) {
            this.heroState.phase = "hpc_transit";
            this.heroState.stageIndex = 0;
            this.heroState.spinProgress = 0;
        }

        // Scene 9: Enter HPC (Keep existing flow for later scenes)
        if (index >= 8) {
            this.heroState.phase = "hpc";
        }
        // Scene 11: Exit
        if (index === 10) {
            this.heroState.phase = "exit";
        }

        // 1. Entering (Scene 1) - Index 0
        if (index === 0) {
            this.updateTextContent("Scene 1 — Entering the Core", "Now you meet the blades.<br/>Not one. Not two.<br/>Rows of them.<br/><br/>Spinning. Precise. Unforgiving.<br/>This is where the real work begins.", "NEXT");
        }

        // 2. First Contact
        if (index === 1) {
            this.updateTextContent("Scene 2 — First Contact", "The first row hits you.<br/>You are squeezed.<br/>Not violently. Deliberately.<br/>Your path bends. Your speed changes.<br/>You survive — and move forward.", "NEXT");
        }

        // 3. Repetition
        if (index === 2) {
            this.updateTextContent("Scene 3 — Repetition Is Power", "Then it happens again.<br/>And again. And again.<br/>Stage after stage.<br/>Each row: Adds energy, Increases pressure, Controls direction.<br/>No randomness allowed.", "NEXT");
        }

        // 4. Myth
        if (index === 3) {
            this.updateTextContent("Scene 4 — Clearing the Myth", "Important clarification.<br/>The compressor does not exist to just speed up air.<br/>That would be useless.<br/>Instead… It stores energy inside the air.<br/>Not as motion. But as pressure.", "NEXT");
        }

        // 5. Moving vs Compressing
        if (index === 4) {
            this.updateTextContent("Scene 5 — Moving vs Compressing", "Here’s the problem.<br/>Air must keep moving forward…<br/>But compression needs resistance.<br/>Too much motion — break.<br/>Too little — no compression.<br/>The compressor walks a knife edge.", "NEXT");
        }

        // 6. Speed Trap
        if (index === 5) {
            this.updateTextContent("Scene 6 — The Speed Trap", "If air moves too fast:<br/>Flow separates. Turbulence forms. Compression collapses.<br/>This leads to instability.<br/>Engines hate instability.", "NEXT");
        }

        // 7. Slow Failure
        if (index === 6) {
            this.updateTextContent("Scene 7 — The Cost of Slow", "If air moves too slow:<br/>Blades lose effectiveness. Pressure rise disappears.<br/>No pressure means no power.<br/>Balance is everything.", "NEXT");
        }

        // 8. Engineering Balance
        if (index === 7) {
            this.updateTextContent("Scene 8 — Engineering the Balance", "Blade angles matter.<br/>Rotation speed matters.<br/>Mass flow rate matters.<br/>Change one — and the entire system reacts.<br/>Nothing here is accidental.", "NEXT");
        }

        // 9. Controlled Direction
        if (index === 8) {
            this.updateTextContent("Scene 9 — Controlled Direction", "The blades don’t just squeeze you.<br/>They guide you.<br/>Each stage straightens the flow, prepares it, and hands it off.<br/>Like passing a fragile object — without dropping it.", "NEXT");
        }

        // 10. Result
        if (index === 9) {
            this.updateTextContent("Scene 10 — The Result", "By the time you exit:<br/>You are hotter.<br/>You are denser.<br/>You are highly pressurized.<br/>But still… You haven’t produced thrust. Not yet.", "NEXT");
        }

        // 11. Setup
        if (index === 10) {
            this.updateTextContent("Scene 11 — The Setup", "You are now perfect fuel for the next step.<br/>Calm. Packed with energy. Ready to release it.<br/>This is where heat enters the story.<br/>➡️ Next: Combustion", "FINISH");
        }
    }

    handleCombustionScene(index) {
        // Isolate Combustion Component
        this.isolateComponent(["Combustor", "Shaft"]); // Show Shaft for context

        // Reset Visuals
        this.atmosphereGroup.visible = false;
        this.heroParticle.visible = false;
        if (this.flowParticles) this.flowParticles.visible = false;

        // Setup Combustion Group (if used, but we use Engine component usually)
        // Ensure Engine is Visible
        this.engine.visible = true;

        // Global Module Settings
        this.controls.enableRotate = true;
        this.controls.enablePan = true;

        // Ensure Physics State
        const s = this.physics.state;

        // Scene 1: Arrival (Index 0)
        // "Design Upgrade: Small pipe present..."
        if (index === 0) {
            this.camera.position.set(-2, 1, 12);
            this.updateTextContent("Scene 1 — Arrival", "You enter the combustion chamber.<br/>Air flows from the compression stage through 12 Diffuser Pipes.<br/>These pipes slow the air down to prepare it for mixing.", "NEXT");
            s.fuelFlow = 0; // Off
        }
        // Scene 2: The Chamber Shape (Index 1)
        if (index === 1) {
            this.camera.position.set(-5, 3, 10); // Zoom Out
            this.updateTextContent("Scene 2 — The Chamber Shape", "Zoom out. This is an annular combustor.<br/>12 independent 'Cans' arranged in a ring.<br/>No single explosion. 12 controlled fires working in unison.", "NEXT");
            s.fuelFlow = 0;
        }
        // Scene 3: Fuel Injection & Ignition (Index 2)
        if (index === 2) {
            // "Camera angle for this module should be -0.4,0.2,12.2"
            this.camera.position.set(-0.4, 0.2, 12.2);
            this.controls.target.set(0, 0, 7.5); // Focus on Combustor (Engine Along Z, X=6.1 -> Z=6.1)
            // Actually Combustor is at x=0 in isolation? 
            // In EngineFactory, Combustor is at ~6.1 (1.1+5.0).
            // But `isolateComponent` might center it? No, it just hides others.
            // Component Global Position:
            // Intake (0) + Compressor (1.1) + Combustor (6.1).
            // Camera (12.2 Z) suggests side view? Or Z is up? In ThreeJS Z is depth.
            // If Engine along X. Z=12.2 is far side.

            this.updateTextContent("Scene 3 — Fuel & Ignition", "Watch closely.<br/>Fuel injection begins.<br/>Ignition triggers in a batch-wise sequence.<br/>Precise control. Optimized timing.", "NEXT");

            // TRIGGER ANIMATION
            s.fuelFlow = 0.5; // Enable Injectors -> Triggers Ignition Sequence
        }
        // Scene 4: Not an Explosion (Index 3)
        if (index === 3) {
            this.camera.position.set(-4, 2, 8);
            this.updateTextContent("Scene 4 — Not an Explosion", "Say this clearly: This is not an explosion.<br/>Explosions are fast.<br/>Engines need slow, steady release.<br/>So instead… Fuel burns. Continuously. Calmly.", "NEXT");
            s.fuelFlow = 0.5;
        }

        // Scene 5: The Surprising Part (Index 4)
        if (index === 4) {
            this.updateTextContent("Scene 5 — The Surprising Part", "Inside the combustor:<br/>Airflow speed is reduced.<br/>Swirl is intentionally created.<br/>Why slow the air? Because fire cannot survive in a hurricane.", "NEXT");
        }
        // Scene 6: Swirl Creation (Index 5)
        if (index === 5) {
            this.updateTextContent("Scene 6 — Swirl Creation", "Swirl vanes rotate incoming air.<br/>Air forms a corkscrew motion.<br/>This rotation slows flow, creates pressure balance, and sets up flame stability.", "NEXT");
        }
        // Scene 7: The Magic Trick (Index 6)
        if (index === 6) {
            this.updateTextContent("Scene 7 — The Magic Trick", "Now comes the magic.<br/>The flame stays in one place…<br/>While air continues moving forward.<br/>This looks impossible. But it works — because of physics.", "NEXT");
        }
        // Scene 8: Recirculation Zones (Index 7)
        if (index === 7) {
            this.updateTextContent("Scene 8 — Recirculation Zones", "Air loops backward near the injector.<br/>A toroidal vortex forms.<br/>Hot gases loop back upstream to ignite fresh fuel.<br/>The flame is not chasing the air. The air feeds the flame.", "NEXT");
        }
        // Scene 9: Flame Holders (Index 8)
        if (index === 8) {
            this.camera.position.set(-2.5, 1.2, 12.8); // Focus on holder
            this.updateTextContent("Scene 9 — Flame Holders", "Small geometric structures create low-velocity pockets.<br/>Without them: Flames would flicker, then disappear.<br/>Fire here is not free. It is trapped — on purpose.", "NEXT");
        }
        // Scene 10: Sixteen Flames (Index 9)
        if (index === 9) {
            this.camera.position.set(-6, 2, 8); // Wide view
            this.updateTextContent("Scene 10 — Sixteen Flames, One System", "Sixteen identical combustion zones.<br/>Each burns evenly, shares pressure, balances temperature.<br/>Uniformity keeps engines alive.", "NEXT");
        }
        // Scene 11: The Key Truth (Index 10)
        if (index === 10) {
            this.updateTextContent("Scene 11 — The Key Truth", "We are not increasing pressure here.<br/>The compressor already did that.<br/>What we add now is energy as heat.<br/>Temperature skyrockets. Gas expands violently.", "NEXT");
        }
        // Scene 12: Energy Without Use (Index 11)
        if (index === 11) {
            this.updateTextContent("Scene 12 — Energy Without Use", "Right now, this energy is trapped.<br/>Hot. Fast. Powerful.<br/>But still… It produces no thrust.<br/>Heat alone does nothing. Energy must be converted.", "NEXT");
        }
        // Scene 13: The Setup (Index 12)
        if (index === 12) {
            this.updateTextContent("Scene 13 — The Setup", "All this fire has one purpose.<br/>To prepare the flow for the next machine.<br/>The one that turns heat into motion.<br/>➡️ Next: Turbine", "FINISH");
        }
    }

    handleTurbineScene(index) {
        // Isolate Turbine + Shaft ONLY (User requested separation)
        this.isolateComponent(["Turbine", "Shaft"]);

        // Reset Visuals
        this.atmosphereGroup.visible = false;
        this.heroParticle.visible = false;

        if (!this.turbineGroup) this.setupTurbineViz();
        this.turbineGroup.visible = true;

        if (this.combustionGroup) this.combustionGroup.visible = false; // Hide fire
        if (this.flowParticles) this.flowParticles.visible = false;
        if (this.flowParticles) this.flowParticles.visible = false;

        this.controls.enableRotate = true;
        this.controls.enablePan = true;

        // Scene 1: What Awaits Ahead
        if (index === 0) {
            this.camera.position.set(-2, 1, 16); // Look at Turbine Face
            this.updateTextContent("Scene 1 — What Awaits Ahead", "Up ahead… Turbine blades wait.<br/>They don’t burn fuel. They don’t compress air.<br/>They are here to collect payment.", "NEXT");
        }
        // Scene 2: Clearing the Role
        if (index === 1) {
            this.updateTextContent("Scene 2 — Clearing the Role", "Say this clearly: The turbine does not add energy.<br/>It takes it back.<br/>The engine borrowed energy during compression. Now it must be repaid.", "NEXT");
        }
        // Scene 3: First Contact
        if (index === 2) {
            this.camera.position.set(-1, 0.5, 15); // Close up
            this.updateTextContent("Scene 3 — First Contact with Hot Gas", "Hot gases rush in.<br/>Violent. Expanding. Packed with thermal energy.<br/>They strike the turbine blades.", "NEXT");
        }
        // Scene 4: Rotation Begins
        if (index === 3) {
            this.updateTextContent("Scene 4 — Rotation Begins", "Gas flow hits curved turbine blades.<br/>Blades rotate. Energy is extracted.<br/>Gas temperature drops.<br/>This is pure energy transfer.", "NEXT");
        }
        // Scene 5: Where Energy Goes
        if (index === 4) {
            this.camera.position.set(-6, 2, 8); // Wide side view showing shaft
            this.updateTextContent("Scene 5 — Where the Energy Goes", "That rotation is not wasted.<br/>A shaft connects turbine to compressor.<br/>As the turbine spins… The compressor spins.<br/>The engine survives.", "NEXT");
        }
        // Scene 6: Tightrope
        if (index === 5) {
            this.updateTextContent("Scene 6 — The Engine’s Tightrope", "This is the most delicate balance.<br/>The turbine must steal just enough energy to keep the engine alive.", "NEXT");
        }
        // Scene 7: Too Much
        if (index === 6) {
            this.updateTextContent("Scene 7 — Too Much vs Too Little", "If the turbine takes too much energy:<br/>Gas slows too much. Exit velocity drops.<br/>The engine lives — but the aircraft doesn’t move.", "NEXT");
        }
        // Scene 8: Too Little
        if (index === 7) {
            this.updateTextContent("Scene 8 — The Other Failure", "If the turbine takes too little energy:<br/>Compressor slows. Pressure collapses. Combustion fails.<br/>The engine dies. Balance is everything.", "NEXT");
        }
        // Scene 9: What Remains
        if (index === 8) {
            this.camera.position.set(-2, 1, 20); // Behind Turbine
            this.updateTextContent("Scene 9 — What Remains", "After the turbine:<br/>You are still fast. Still hot. Still energetic.<br/>But now… The engine has paid its internal debt.", "NEXT");
        }
        // Scene 10: Final Step
        if (index === 9) {
            this.updateTextContent("Scene 10 — Ready for the Final Step", "What remains is not for the engine.<br/>It is for the aircraft.<br/>➡️ Next: The Nozzle", "FINISH");
        }
    }

    setupTurbineViz() {
        this.turbineGroup = new THREE.Group();
        // Attach to Engine!
        if (this.engine) this.engine.add(this.turbineGroup);
        else this.scene.add(this.turbineGroup);

        // Particles for Turbine Flow
        // Start from Combustor Exit (X ~ 8.9) -> End of Turbine (X ~ 12.1)
        const count = 2000;
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const userData = [];

        for (let i = 0; i < count; i++) {
            const r = 1.0 + Math.random() * 0.5;
            const theta = Math.random() * Math.PI * 2;

            // Axial X
            pos[i * 3] = 8.9 + Math.random() * 3.2; // 8.9 to 12.1
            // Radial Y/Z
            pos[i * 3 + 1] = r * Math.cos(theta);
            pos[i * 3 + 2] = r * Math.sin(theta);

            userData.push({
                angle: theta,
                speed: 5.0 + Math.random() * 2.0, // Fast
                radius: r
            });
        }
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.8 });
        this.turbPart = new THREE.Points(geom, mat);
        this.turbPart.userData = { config: userData };
        this.turbineGroup.add(this.turbPart);
    }

    handleNozzleScene(index) {
        // Isolate Nozzle Only
        this.isolateComponent(["Nozzle", "Cone", "Tail"]);

        // Reset Visuals
        this.atmosphereGroup.visible = false;
        this.heroParticle.visible = false;
        if (this.combustionGroup) this.combustionGroup.visible = false;
        if (this.turbineGroup) this.turbineGroup.visible = false;

        if (!this.nozzleGroup) this.setupNozzleViz();
        this.nozzleGroup.visible = true;

        this.controls.enableRotate = true;
        this.controls.enablePan = true;

        // Scene 1: Moment of Clarity
        if (index === 0) {
            this.camera.position.set(-2, 1, 22); // Nozzle Entrance
            this.updateTextContent("Scene 1 — The Moment of Clarity", "This is where everything makes sense.<br/>All that pressure. Heat. Control.<br/>It all leads here.", "NEXT");
        }
        // Scene 2: The Job
        if (index === 1) {
            this.updateTextContent("Scene 2 — The Nozzle’s Job", "The nozzle has only one purpose:<br/>To convert energy into velocity.<br/>Nothing else matters now.", "NEXT");
        }
        // Scene 3: Expansion
        if (index === 2) {
            this.camera.position.set(-5, 0, 24); // Side view
            this.updateTextContent("Scene 3 — Expansion Begins", "Flow expands through the nozzle.<br/>Pressure drops. Temperature drops.<br/>Velocity explodes.<br/>Energy becomes motion.", "NEXT");
        }
        // Scene 4: Direction
        if (index === 3) {
            this.updateTextContent("Scene 4 — Direction Matters", "The flow is forced backward.<br/>Perfectly aligned. Highly accelerated.<br/>No rotation. No chaos. Just speed.", "NEXT");
        }
        // Scene 5: Invisible Push
        if (index === 4) {
            this.updateTextContent("Scene 5 — The Invisible Push", "At that exact moment…<br/>You are thrown backward.<br/>And the aircraft responds.", "NEXT");
        }
        // Scene 6: Thrust
        if (index === 5) {
            this.updateTextContent("Scene 6 — The Definition of Thrust", "The engine moves forward because you moved backward.<br/>Newton’s Third Law.<br/>Nothing mystical. Just physics.", "NEXT");
        }
        // Scene 7: End
        if (index === 6) {
            this.camera.position.set(0, 5, 30); // Rear looking back
            this.updateTextContent("Scene 7 — The End of the Journey", "Your journey ends as exhaust.<br/>The aircraft’s journey continues.<br/>Powered. Balanced. Alive.", "FINISH");
        }
    }

    setupNozzleViz() {
        this.nozzleGroup = new THREE.Group();
        // Attach to Engine!
        if (this.engine) this.engine.add(this.nozzleGroup);
        else this.scene.add(this.nozzleGroup);

        // Particles for Nozzle Flow
        // Start from Turbine Exit (X ~ 12.1) -> Far Exit (X ~ 16+)
        const count = 2000;
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const userData = [];

        for (let i = 0; i < count; i++) {
            // Pos Radial
            const r = Math.random() * 0.8;
            const th = Math.random() * 2 * Math.PI;

            pos[i * 3] = 12.1 + Math.random() * 2; // Start near entrance
            pos[i * 3 + 1] = r * Math.cos(th);
            pos[i * 3 + 2] = r * Math.sin(th);

            userData.push({
                speed: 10.0 + Math.random() * 5.0, // Initial speed
                accel: 20.0, // Acceleration
            });
        }
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
        this.nozPart = new THREE.Points(geom, mat);
        this.nozPart.userData = { config: userData };
        this.nozzleGroup.add(this.nozPart);
    }

    setupCombustionViz() {
        this.combustionGroup = new THREE.Group();
        // Attach to Engine to match coordinate system
        if (this.engine) this.engine.add(this.combustionGroup);
        else this.scene.add(this.combustionGroup);

        // 12 Streams of Air Particles
        const count = 2000;
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const userData = [];

        for (let i = 0; i < count; i++) {
            const canIndex = Math.floor(Math.random() * 12);
            const theta = (canIndex / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;

            // Start at HPC Exit (Diffuser Start)
            // Local X (Axial) = 6.1. Radius = 0.79.
            const r = 0.79 + (Math.random() - 0.5) * 0.05;

            const drive = Math.random();
            const axial = 6.1 + drive * 0.5; // 6.1 to 6.6

            // COORDINATE FIX: Engine is rotated -90 deg Y. 
            // Engine X is Axial. Engine Y/Z are Radial.

            pos[i * 3] = axial;        // X (Axial)
            // If Engine Y is Up (Sin), then Side is Z (Cos).
            // NOTE: Combustor.js uses Y=cos, Z=sin.
            // Let's match Combustor.js:
            // Y = Cos(theta)*R
            // Z = Sin(theta)*R

            pos[i * 3 + 1] = r * Math.cos(theta); // Y
            pos[i * 3 + 2] = r * Math.sin(theta); // Z

            userData.push({
                speed: 3.0 + Math.random() * 1.0,
                canIndex: canIndex,
                thetaOffset: theta - (canIndex / 12) * Math.PI * 2,
                drive: drive
            });

            // Color: Compressed Air (Blue/Purple)
            colors[i * 3] = 0.3; colors[i * 3 + 1] = 0.2; colors[i * 3 + 2] = 1.0;
        }
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });

        this.combPart = new THREE.Points(geom, mat);
        this.combPart.userData = { config: userData };
        this.combustionGroup.add(this.combPart);
    }



    addLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambient);
        const keyLight = new THREE.DirectionalLight(0xfffaed, 2.0);
        this.scene.add(keyLight);
        const rimLight = new THREE.SpotLight(0x4455ff, 5.0);
        rimLight.position.set(-5, 0, -5);
        this.scene.add(rimLight);
        const bottomLight = new THREE.DirectionalLight(0x222222, 1.0);
        bottomLight.position.set(0, -10, 0);
        this.scene.add(bottomLight);
    }

    createTextWidget() {
        this.textWidget = document.createElement('div');
        Object.assign(this.textWidget.style, {
            position: 'absolute', bottom: '30px', left: '30px', transform: 'none',
            padding: '15px 25px', background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '16px', color: '#e2e8f0',
            fontFamily: "'Inter', sans-serif", fontSize: '1rem', lineHeight: '1.6',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            // EXACT FIT CONTENT
            maxWidth: 'min(500px, 90vw)', width: 'fit-content',
            textAlign: 'left', transition: 'all 0.3s ease', zIndex: '100'
        });
        this.textTitle = document.createElement('div');
        this.textTitle.style.cssText = "font-size: 0.85rem; text-transform: uppercase; color: #718096; letter-spacing: 2px; margin-bottom: 8px; font-weight: 700;";
        this.textWidget.appendChild(this.textTitle);
        this.textBody = document.createElement('div');
        this.textBody.style.cssText = "font-weight: 400; font-size: 1.15rem; color: #ffffff; margin-bottom: 20px;";
        this.textWidget.appendChild(this.textBody);
        this.continueBtn = document.createElement('button');
        Object.assign(this.continueBtn.style, {
            padding: "10px 25px", background: "#3182ce", color: "white", border: "none", borderRadius: "50px",
            fontSize: "0.9rem", fontWeight: "600", cursor: "pointer", letterSpacing: "1px", transition: "transform 0.2s"
        });
        this.continueBtn.onclick = () => {
            // Logic based on scenario
            // Logic based on scenario
            let max = 2;
            if (this.scenario === "intake") max = 8;
            if (this.scenario === "compressor") max = 10;
            if (this.scenario === "combustion") max = 12;
            if (this.scenario === "turbine") max = 9; // Scenes 0-9 (10 scenes)
            if (this.scenario === "nozzle") max = 6; // Scenes 0-6 (7 scenes)

            if (this.currentScene < max) {
                this.switchScene(this.currentScene + 1);
            } else if (this.scenario === "compressor" && this.currentScene === 10) {
                this.scenario = "combustion";
                this.switchScene(0);
            } else if (this.scenario === "combustion" && this.currentScene === 12) {
                this.scenario = "turbine";
                this.switchScene(0);
            } else if (this.scenario === "turbine" && this.currentScene === 9) {
                this.scenario = "nozzle";
                this.switchScene(0);
            }
        };
        this.textWidget.appendChild(this.continueBtn);
        this.container.appendChild(this.textWidget);
    }

    createDebugWidget() {
        this.debugWidget = document.createElement('div');
        Object.assign(this.debugWidget.style, {
            position: 'absolute', top: '10px', right: '10px',
            background: 'rgba(0, 0, 0, 0.5)', color: '#0f0',
            fontFamily: 'monospace', padding: '10px',
            pointerEvents: 'none', whiteSpace: 'pre'
        });
        this.container.appendChild(this.debugWidget);
    }

    updateTextContent(title, body, btnText) {
        if (this.textTitle) this.textTitle.innerText = title;
        if (this.textBody) this.textBody.innerHTML = body;
        if (btnText) {
            this.continueBtn.style.display = "inline-block";
            this.continueBtn.innerText = btnText;
        } else {
            this.continueBtn.style.display = "none";
        }
    }

    onResize() {
        if (!this.camera || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
        if (!this.renderer) return;

        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        this.sceneTime += dt;

        // Debug
        if (this.debugWidget && this.camera) {
            const x = this.camera.position.x.toFixed(1);
            const y = this.camera.position.y.toFixed(1);
            const z = this.camera.position.z.toFixed(1);
            let text = `Cam: ( ${x}, ${y}, ${z} )`;
            if (this.lastClickPos) text += `\n${this.lastClickPos}`;
            this.debugWidget.innerText = text;
        }

        if (this.scenario === "intro_particle") {
            this.animateIntro(dt);
        } else if (this.scenario === "intake") {
            this.animateIntake(dt);
        } else if (this.scenario === "compressor") {
            this.animateCompressor(dt);
        } else if (this.scenario === "combustion") {
            this.animateCombustion(dt);
        } else if (this.scenario === "turbine") {
            this.animateTurbine(dt);
        } else if (this.scenario === "nozzle") {
            this.animateNozzle(dt);
        }

        // HEAT GLOW VISUALIZATION
        if (this.engine && this.physics && this.physics.state) {
            const s = this.physics.state;
            const getHeatColor = (temp, minT, maxT) => {
                const t = Math.max(0, Math.min(1, (temp - minT) / (maxT - minT)));
                // Blackbodyish: Red -> Orange -> Yellow
                return { r: Math.min(1, t * 2.0), g: Math.min(1, Math.max(0, (t - 0.3) * 1.5)), b: Math.min(1, Math.max(0, (t - 0.8) * 3.0)) };
            };

            const cComb = getHeatColor(s.t4, 400, 2000);
            const cExh = getHeatColor(s.egt, 300, 1000);

            this.engine.traverse((child) => {
                if (child.isMesh && child.material && child.material.emissive) {
                    // Combustor
                    if (child.parent && child.parent.name.includes("Combustor")) {
                        child.material.emissive.setRGB(cComb.r, cComb.g, cComb.b);
                        child.material.emissiveIntensity = 0.5 + cComb.r;
                    }
                    // Turbine/Nozzle
                    if (child.parent && (child.parent.name.includes("Turbine") || child.parent.name.includes("Nozzle"))) {
                        child.material.emissive.setRGB(cExh.r, cExh.g, cExh.b);
                        child.material.emissiveIntensity = 0.5 + cExh.r;
                    }
                }
            });
        }

        this.controls.update();
        this.composer.render();
    }

    animateIntro(dt) {
        // Existing Intro Logic
        if (this.currentScene === 0 && this.atmosphereGroup) {
            this.heroParticle.position.x += (Math.random() - 0.5) * dt * 0.5;
            this.heroParticle.position.y += (Math.random() - 0.5) * dt * 0.5;
            this.heroParticle.position.x *= 0.98;
            this.heroParticle.position.y *= 0.98;
            this.atmosphereGroup.rotation.y += 0.05 * dt;
        }
        if (this.currentScene === 1) {
            const delay = 1.0;
            if (this.sceneTime > delay) {
                if (!this.surpriseState) {
                    this.surpriseState = true;
                    this.engine.visible = true;
                    this.updateTextContent("And suddenly —", "An aircraft approaches...", null);
                }
                if (this.engine.position.z < 2.0) this.engine.position.z += 120.0 * dt;

                if (this.heroParticle && this.engine.position.z > -15) {
                    if (this.continueBtn.style.display === "none") {
                        this.continueBtn.style.display = "inline-block";
                        this.continueBtn.innerText = "CONTINUE";
                    }
                    const angle = this.sceneTime * 10.0;
                    const radius = Math.max(0, 1.0 - (this.sceneTime - delay) * 0.5);
                    this.heroParticle.position.x += (radius * Math.cos(angle) - this.heroParticle.position.x) * 5.0 * dt;
                    this.heroParticle.position.y += (radius * Math.sin(angle) - this.heroParticle.position.y) * 5.0 * dt;
                    this.heroParticle.position.z -= 10.0 * dt;
                    if (this.heroParticle.position.z < -2) this.heroParticle.visible = false;
                }
                this.engine.traverse(obj => { if (obj.name === "Compressor" && obj.rotation) obj.rotation.x += 30 * dt; });
            }
        }
        if (this.currentScene === 2) {
            this.engine.traverse(obj => { if (obj.name === "Compressor" && obj.rotation) obj.rotation.x += 10 * dt; });
            if (this.heroParticle) this.heroParticle.scale.setScalar(0.5 + Math.sin(this.sceneTime * 8) * 0.1);
        }
    }

    animateIntake(dt) {
        if (this.flowParticles && this.flowParticles.visible) {
            const positions = this.flowParticles.geometry.attributes.position.array;
            const configs = this.flowParticles.userData.config;

            // States
            const isChaotic = (this.currentScene === 2);
            const isSlowing = (this.currentScene === 3); // Scene 4
            const isPressure = (this.currentScene === 4); // Scene 5
            const isStraight = (this.currentScene >= 5 && this.currentScene < 7);
            const isTranslating = (this.currentScene === 7);

            // Color Update
            if (isPressure) {
                this.flowParticles.material.color.setHex(0xff9999); // Reddish
            } else {
                this.flowParticles.material.color.setHex(0xaaccff); // Blueish
            }

            for (let i = 0; i < configs.length; i++) {
                let ix = i * 3;

                // Movement
                let speed = configs[i].speed;
                if (isSlowing) speed *= 0.5;
                if (isPressure) speed *= 0.2; // Very slow

                // Default Direction: -Z (Front to Back)
                let dir = -1;
                positions[ix + 2] += speed * dir * dt;

                // Wrapping
                if (positions[ix + 2] < -5) {
                    positions[ix + 2] = 10;
                    if (isStraight) {
                        const row = (i % 10) - 5;
                        const col = (Math.floor(i / 10) % 10) - 5;
                        positions[ix] = row * 0.3;
                        positions[ix + 1] = col * 0.3;
                    } else if (isSlowing || isPressure) {
                        // Spawn in a circle/cylinder
                        const r = Math.sqrt(Math.random()) * 1.0; // Radius 1.0
                        const theta = Math.random() * 2 * Math.PI;
                        positions[ix] = r * Math.cos(theta);
                        positions[ix + 1] = r * Math.sin(theta);
                    } else {
                        positions[ix] = (Math.random() - 0.5) * 5;
                        positions[ix + 1] = (Math.random() - 0.5) * 5;
                    }
                }

                // Behaviors
                if (isChaotic) {
                    positions[ix] += (Math.random() - 0.5) * 8 * dt;
                    positions[ix + 1] += (Math.random() - 0.5) * 8 * dt;
                }
                else if (isSlowing || isPressure) {
                    // BEAM LOGIC: Constrain to cylinder, don't collapse to 0
                    // Move towards a radius of ~0.8 (slightly compressed)
                    // But keep some minimal random motion to look like "flow"
                    const x = positions[ix];
                    const y = positions[ix + 1];
                    const currentR = Math.sqrt(x * x + y * y);

                    if (currentR > 1.2) {
                        // Compress outer particles in
                        positions[ix] *= 0.95;
                        positions[ix + 1] *= 0.95;
                    }
                    else if (currentR < 0.2) {
                        // Don't let them all bunch in center perfectly
                        // positions[ix] *= 1.01; 
                        // positions[ix+1] *= 1.01;
                    }

                    // Add slight "beam" jitter but keep within bounds
                    positions[ix] += (Math.random() - 0.5) * 0.5 * dt;
                    positions[ix + 1] += (Math.random() - 0.5) * 0.5 * dt;
                }
                else if (isStraight) {
                    // Force into grid
                    const row = (i % 10) - 5;
                    const col = (Math.floor(i / 10) % 10) - 5;
                    const tx = row * 0.3;
                    const ty = col * 0.3;
                    positions[ix] += (tx - positions[ix]) * 5.0 * dt;
                    positions[ix + 1] += (ty - positions[ix + 1]) * 5.0 * dt;
                }


                else if (isTranslating) {
                    // Z>2 Chaos, Z<2 Calm Beam
                    if (positions[ix + 2] > 2) {
                        positions[ix] += (Math.random() - 0.5) * 5 * dt;
                        positions[ix + 1] += (Math.random() - 0.5) * 5 * dt;
                    } else {
                        // BEAM LOGIC
                        const x = positions[ix];
                        const y = positions[ix + 1];
                        const currentR = Math.sqrt(x * x + y * y);

                        if (currentR > 1.2) {
                            positions[ix] *= 0.95;
                            positions[ix + 1] *= 0.95;
                        }
                        positions[ix] += (Math.random() - 0.5) * 0.5 * dt;
                        positions[ix + 1] += (Math.random() - 0.5) * 0.5 * dt;
                    }
                }
            }
            this.flowParticles.geometry.attributes.position.needsUpdate = true;
        }

        if (this.heroParticle && this.currentScene === 0) {
            this.heroParticle.position.y = Math.sin(this.sceneTime) * 0.2;
        }
    }

    animateCombustion(dt) {

        // Update Components (Batch Logic etc)
        this.engine.traverse(obj => {
            if (obj.update) obj.update(dt, this.physics);
        });

        if (!this.combPart || !this.combPart.visible) return;

        const positions = this.combPart.geometry.attributes.position.array;
        const colors = this.combPart.geometry.attributes.color.array;
        const configs = this.combPart.userData.config;

        const isBurn = (this.currentScene >= 2); // Prompt: "index===2" is Fuel Injection

        for (let i = 0; i < configs.length; i++) {
            let ix = i * 3;
            const cfg = configs[i];

            // Axial Movement (X IS AXIAL)
            // X Range: 6.1 (Diffuser In) -> 6.6 (Can In) -> 9.0 (Exit)
            let axial = positions[ix];
            let speed = cfg.speed;

            // Slow down in Can (Combustion)
            if (axial > 6.6) speed *= 0.8;

            // FLOW SCALAR (Combustor)
            let flowScalar = 0.0;
            if (this.physics && this.physics.state) {
                flowScalar = this.physics.state.rpm / 100.0;
            }

            axial += speed * dt * flowScalar;

            // Wrapping
            if (axial > 9.0) {
                axial = 6.1;
                cfg.canIndex = Math.floor(Math.random() * 12);
            }

            positions[ix] = axial;

            // Radial / Theta Logic
            // 1. Diffuser (6.1 to 6.6): Converge R 0.79 -> 0.725
            // 2. Can (6.6+): Stay at 0.725 (relative to Can Center?)

            let r = 0.79;
            let thetaTarget = (cfg.canIndex / 12) * Math.PI * 2;

            if (axial < 6.6) {
                const t = (axial - 6.1) / 0.5; // 0 to 1
                r = 0.79 + t * (0.725 - 0.79);
            } else {
                r = 0.725;
            }

            // Theta: Particles stick to their Can-Angle with slight noise
            const theta = thetaTarget + cfg.thetaOffset; // Keep relative offset

            // MATCH Combustor.js: Y=Cos, Z=Sin
            const y = r * Math.cos(theta);
            const z = r * Math.sin(theta);

            positions[ix + 1] = y;
            positions[ix + 2] = z;

            // Color Logic (Burn)
            // If axial > 6.8 (In Can) and isBurn

            // PHYSICS CHECK: Only burn if Ignition AND T4 is high
            let t4 = 300;
            let ignition = false;
            if (this.physics) {
                t4 = this.physics.stations[4].T;
                ignition = this.physics.inputs.ignition;
            }

            if (isBurn && axial > 6.8 && ignition && t4 > 400) {
                // Transition Blue -> Red/White based on T4
                // Max T4 ~ 1800K
                const heatP = Math.min((t4 - 400) / 1400.0, 1.0);

                const burnP = Math.min((axial - 6.8) / 1.0, 1.0);

                // Intensity driven by HeatP
                colors[ix] = 0.3 + burnP * 0.7 * heatP;
                colors[ix + 1] = 0.2 + burnP * 0.5 * heatP;
                colors[ix + 2] = 1.0 - burnP * 1.0 * heatP; // Turns from Blue to Yellow/Red
            } else {
                // Air Blue (Cold Flow)
                colors[ix] = 0.3; colors[ix + 1] = 0.2; colors[ix + 2] = 1.0;
            }
        }
        this.combPart.geometry.attributes.position.needsUpdate = true;
        this.combPart.geometry.attributes.color.needsUpdate = true;
    }

    animateTurbine(dt) {
        if (!this.turbineGroup || !this.turbineGroup.visible) return;

        // 1. Mechanical Rotation (Turbine Drives Everything)
        // Physics RPM (0-100%) -> Rad/s
        let rpm = 0;
        if (this.physics && this.physics.state) {
            rpm = this.physics.state.rpm;
        }

        // 100% RPM = ~60 rad/s visually
        const rotSpeed = (rpm / 100.0) * 60.0;

        // Rotate Turbine Group
        this.engine.traverse(obj => {
            // Find Turbine parts
            if (obj.parent && obj.parent.name === "Turbine") {
                // Rotate blades (Rotor)
                if (!obj.name.includes("Stator") && !obj.name.includes("Vane") && !obj.name.includes("Case")) {
                    if (obj.rotation) obj.rotation.x += rotSpeed * dt;
                }
            }
            // VISUAL TRICK: Rotate Compressor too! (Shaft Link)
            if (obj.parent && obj.parent.name === "Compressor") {
                if (!obj.name.includes("Stator") && !obj.name.includes("Vane") && !obj.name.includes("Case")) {
                    if (obj.rotation) obj.rotation.x += rotSpeed * dt;
                }
            }
            // Shaft
            if (obj.name === "Shaft" || obj.name === "CentralShaft") {
                if (obj.rotation) obj.rotation.x += rotSpeed * dt;
            }
        });

        // 2. Particle Physics - Swirl & Expansion
        if (this.turbPart) {
            const positions = this.turbPart.geometry.attributes.position.array;
            const colors = this.turbPart.geometry.attributes.color.array; // We need color array
            const configs = this.turbPart.userData.config;

            // Turbine Geometry constants
            const tStart = 8.9;
            const tEnd = 12.1;
            const tLen = 3.2;

            // Radius Expansion:
            // Hub: 0.45 -> 0.70
            // Tip: 1.00 -> 1.55

            for (let i = 0; i < configs.length; i++) {
                const ix = i * 3;
                let ax = positions[ix]; // Axial (X)

                // Advance Axial
                // FLOW SCALAR
                let flowScalar = 0.0;
                if (this.physics && this.physics.state) {
                    flowScalar = this.physics.state.rpm / 100.0;
                }

                let speed = configs[i].speed;
                ax += speed * dt * flowScalar; // STOP if flow is 0

                // Wrapping
                if (ax > tEnd) {
                    ax = tStart;
                    // Reset Speed/Radius Logic if needed
                    configs[i].tOffset = Math.random();
                }

                // Calculate Progress t (0 to 1)
                const t = Math.max(0, Math.min(1, (ax - tStart) / tLen));

                // Swirl Logic
                // We track angle in config to accumulate rotation
                let theta = configs[i].angle;
                const swirlSpeed = 15.0; // Rad/s (Match Rotor)
                theta += swirlSpeed * dt;
                configs[i].angle = theta; // Save state!

                // Radius Logic (Expansion)
                // Interpolate Engine Bounds
                const hubR = 0.45 + (0.70 - 0.45) * t;
                const tipR = 1.00 + (1.55 - 1.00) * t;

                // Particle restricted to annulus
                // We assign a relative radial position 'rRel' (0 to 1) at spawn
                const rRel = configs[i].rRel || 0.5; // Fallback
                const currentR = hubR + rRel * (tipR - hubR);

                // Apply Swirl Position
                const y = currentR * Math.cos(theta); // Match Cos/Sin Y/Z
                const z = currentR * Math.sin(theta);

                positions[ix] = ax;
                positions[ix + 1] = y;
                positions[ix + 2] = z;

                // Color Change (Temp Drop)
                // PHYSICS LINK: Turbine Entry Temp (T4) -> Exit (T5)
                let t4 = 300, t5 = 300;
                if (this.physics && this.physics.state) {
                    t4 = this.physics.stations[4].T;
                    t5 = this.physics.state.egt;
                }

                // Interpolate Temp along Turbine length (t)
                const localT = t4 * (1 - t) + t5 * t;
                const tNorm = Math.min(Math.max((localT - 300) / 1200.0, 0.0), 1.0); // 300-1500K Range

                // Red/Orange -> Blue/Dark
                const rC = tNorm;
                const gC = tNorm * 0.5; // Orange tint
                const bC = 0.2 + (1.0 - tNorm) * 0.8; // Blue when cold

                colors[ix] = rC;
                colors[ix + 1] = gC;
                colors[ix + 2] = bC;
            }
            this.turbPart.geometry.attributes.position.needsUpdate = true;
            this.turbPart.geometry.attributes.color.needsUpdate = true;
        }
    }

    animateNozzle(dt) {
        if (!this.nozzleGroup || !this.nozzleGroup.visible) return;

        if (this.nozPart) {
            const positions = this.nozPart.geometry.attributes.position.array;
            const colors = this.nozPart.geometry.attributes.color.array;
            const configs = this.nozPart.userData.config;

            // Nozzle Geometry Constants
            const nStart = 12.1;
            const nLen = 4.0; // Extend well past exit (2.0 structure + 2.0 plume)

            // Radius Profiles
            // Inner (Cone): 0.7 -> 0.0 (at Length 2.0)
            // Outer (Shell): 1.55 -> 0.95 (at Length 2.0)

            for (let i = 0; i < configs.length; i++) {
                const ix = i * 3;
                let ax = positions[ix];

                // Physics: Expansion & Acceleration
                // FLOW SCALAR:
                let flowScalar = 0.0;
                if (this.physics && this.physics.state) {
                    flowScalar = this.physics.state.rpm / 100.0;
                }

                let speed = configs[i].speed;
                const accel = configs[i].accel;

                // Only accelerate if there is flow
                if (flowScalar > 0.01) {
                    speed += accel * dt * flowScalar;
                    ax += speed * dt * flowScalar;
                }

                // Wrapping
                if (ax > nStart + nLen) {
                    ax = nStart;
                    speed = 10.0 + Math.random() * 5.0; // Reset speed
                    configs[i].speed = speed;
                    // Reset Radial Relative Pos
                    configs[i].rRel = Math.random();
                    configs[i].angle = Math.random() * 2 * Math.PI;
                }
                else {
                    configs[i].speed = speed;
                }

                // Calculate Geometry Constraints
                // tGeo: 0 to 1 along the physical nozzle (Length 2.0)
                // If ax > 14.1, we are in the plume (free expansion)
                const dist = ax - nStart;
                const tGeo = Math.min(dist / 2.0, 1.0); // Clamped for geometry

                // Inner Radius (The Cone) -> Avoid this!
                const rInner = 0.7 * (1.0 - tGeo); // Linear taper 0.7 -> 0

                // Outer Radius (The Shell)
                // Profile Match: Inlet 1.55 -> Throat 1.25 (at 40%) -> Exit 0.95 (at 100%)
                let rOuter = 1.55;
                if (tGeo <= 0.4) {
                    // Inlet to Throat (0.0 to 0.4)
                    const tSub = tGeo / 0.4;
                    rOuter = 1.55 + (1.25 - 1.55) * tSub;
                } else {
                    // Throat to Exit (0.4 to 1.0)
                    const tSub = (tGeo - 0.4) / 0.6;
                    rOuter = 1.25 + (0.95 - 1.25) * tSub;
                }

                // Plume Expansion (After Exit)
                if (dist > 2.0) {
                    // Inside plume, Inner is 0. Outer expands rapidly.

                    // DYNAMIC EXPANSION:
                    // If Thrust is high, plume expands more?
                    // Let's link to Pressure Ratio (state.p3 / p0 approx or RPM)
                    let pressureFactor = 1.0;
                    if (this.physics && this.physics.state) {
                        const rpm = this.physics.state.rpm;
                        pressureFactor = 1.0 + (rpm / 100.0) * 1.5; // Up to 2.5x expansion at max
                    }

                    const tPlume = (dist - 2.0);
                    rOuter = 0.95 + tPlume * 0.5 * pressureFactor; // Expand with Thrust
                }

                // Place Particle in Annulus (Outside Cone, Inside Shell)
                const rRel = configs[i].rRel || 0.5;
                // Add padding: rInner+0.05 to rOuter-0.08 (Keep strictly inside)
                const r = (rInner + 0.05) + rRel * ((rOuter - 0.08) - (rInner + 0.05));

                // Nozzle straightens the flow (Dampen any swirl)
                const theta = configs[i].angle; // Fixed angle, no swirl update

                positions[ix] = ax;
                positions[ix + 1] = r * Math.cos(theta);
                positions[ix + 2] = r * Math.sin(theta);

                // Color: Hot -> Cool -> Transparent?
                // Link to EGT (T5)
                let t5 = 300;
                if (this.physics && this.physics.state) t5 = this.physics.state.egt;

                // 300K (Blue) -> 1000K (Yellow/White)
                const tNorm = Math.min(Math.max((t5 - 300) / 700.0, 0.0), 1.0);

                // Shock Diamonds at high thrust?
                const rC = 0.2 + tNorm * 0.8;
                const gC = 0.2 + tNorm * 0.8;
                const bC = 1.0 - tNorm * 0.5;

                colors[ix] = rC; colors[ix + 1] = gC; colors[ix + 2] = bC;
            }
            this.nozPart.geometry.attributes.position.needsUpdate = true;
            this.nozPart.geometry.attributes.color.needsUpdate = true;
        }
    }

    animateCompressor(dt) {
        // Spin the compressor blades (Rotors vs Stators)
        // Rotors (Moving): Spinner, Shaft, Rotor, Blade, Fan
        // Stators (Static): Stator, Vane, Case

        // 1. DYNAMIC ROTATION SPEED
        let rpm = 0;
        if (this.physics && this.physics.state) {
            rpm = this.physics.state.rpm;
        }
        // Visual Scaling: 100% RPM = ~60 rad/s
        const rotSpeed = (rpm / 100.0) * 60.0;

        this.engine.traverse(obj => {
            const name = obj.name.toLowerCase();
            // Core rotating parts
            if (name === "spinner" || name === "shaft") {
                if (obj.rotation) obj.rotation.x += rotSpeed * dt;
            }
            // Compressor parts: Check if it's a rotor or generic blade not explicitly a stator
            else if (obj.parent && obj.parent.name === "Compressor") {
                if (!name.includes("stator") && !name.includes("vane") && !name.includes("case")) {
                    if (obj.rotation) obj.rotation.x += rotSpeed * dt;
                }
            }
        });

        // Particle Flow Logic
        if (this.flowParticles && this.flowParticles.visible) {
            const positions = this.flowParticles.geometry.attributes.position.array;
            const colors = this.flowParticles.geometry.attributes.color.array;
            const configs = this.flowParticles.userData.config;

            // 1. CONTINUOUS ANNULAR FLOW (Dynamic Constraints)
            const stages = this.allStages || [];

            for (let i = 0; i < configs.length; i++) {
                let ix = i * 3;
                let cfg = configs[i];
                let z = positions[ix + 2];

                // --- RESET ---
                if (z > 7.0) {
                    z = -5;
                    positions[ix + 2] = z;
                    // Random Annulus Start
                    const r = 0.6 + Math.random() * 0.3;
                    const theta = Math.random() * 2 * Math.PI;
                    positions[ix] = r * Math.cos(theta);
                    positions[ix + 1] = r * Math.sin(theta);
                    continue;
                }

                // --- PRESSURE / HEAT VISUALIZATION (PHYSICS LINKED) ---
                // Get Physics State
                const P_ratio = (this.physics && this.physics.state) ? (this.physics.state.rpm / 100.0 * 25.0) : 1.0;
                // Approx PR linked to RPM (0 -> 25)

                let heat = 0;
                if (z > 1.1) {
                    // Base heat on Z progress (Compression Work)
                    let stageP = 0;
                    if (z < 3.1) stageP = (z - 1.1) / 2.0; // LPC
                    else stageP = 0.5 + (z - 3.1) / 2.9 * 0.5; // HPC

                    // Multiply by actual Engine PR (If RPM is low, heat is low!)
                    heat = stageP * (Math.min(P_ratio, 15.0) / 15.0);
                }
                heat = Math.min(Math.max(heat, 0), 1);

                // Color Map: Blue (Cool) -> Purple -> Red (Hot)
                colors[ix] = heat;             // R: Increases
                colors[ix + 1] = 0.0;          // G: 0
                colors[ix + 2] = 1.0 - heat * 0.8; // B: Decreases (stays slight for purple)

                // --- 1. AXIAL SPEED (Continuous - No Stops) ---
                // FLOW SCALAR (Compressor)
                let flowScalar = 0.0;
                if (this.physics && this.physics.state) {
                    // Non-linear flow at low RPM? 
                    // Simple linear for visual clarity
                    flowScalar = this.physics.state.rpm / 100.0;
                }

                let axialSpeed = 1.5 * flowScalar;
                // Intake: Faster
                if (z < 1.1) axialSpeed = 2.5 * flowScalar;
                // HPC: Slower (Compressed)
                else if (z > 3.5) axialSpeed = 1.2 * flowScalar;

                // --- 2. SWIRL LOGIC (Based on proximity to Rotors) ---
                let omega = 0.5; // Base drift (Stator-like)

                if (z > 1.1 && z < 6.5) {
                    for (let s of stages) {
                        // Check if inside specific blade row
                        if (Math.abs(z - s.z) < 0.15) {
                            if (s.type === 'rotor') {
                                // SYNCHRONIZED SPIN:
                                // Visual Rotor Speed is 15.0 rad/s (Line 1385).
                                // Particles must match this to flow "with" the blades, not through them.
                                omega = 15.0;
                            } else {
                                // Stator: Straighten / Slow Drift
                                omega = 0.2;
                            }
                            break;
                        }
                    }
                }

                // --- 3. DYNAMIC RADIUS CONSTRAINTS (The "Accompany" Logic) ---
                // Calculate Hub Radius at current Z
                let hubR = 0.35; // Default Intake
                const caseR = 1.0;

                if (z > 1.1 && z <= 3.1) { // LPC Taper
                    const t = (z - 1.1) / 2.0;
                    hubR = 0.35 + t * (0.58 - 0.35);
                } else if (z > 3.1) { // HPC Constant
                    hubR = 0.58;
                }

                // --- INTEGRATION ---
                // Z-Move
                positions[ix + 2] = z + axialSpeed * dt;

                // Theta-Move
                if (omega > 0) {
                    const dTheta = omega * dt;
                    const x = positions[ix];
                    const y = positions[ix + 1];
                    const cos = Math.cos(dTheta);
                    const sin = Math.sin(dTheta);
                    positions[ix] = x * cos - y * sin;
                    positions[ix + 1] = x * sin + y * cos;
                }

                // Radial Clamp
                const x = positions[ix];
                const y = positions[ix + 1];
                const curR = Math.sqrt(x * x + y * y);

                // Target Annulus: Midpoint between Hub and Case? 
                // Or just clamp?
                // "No particle should go above compressor parts (1.0)"
                // "Should accompany blade radius" (Stay in annulus)
                const minR = hubR + 0.05;
                const maxR = caseR - 0.05;

                if (curR < minR || curR > maxR) {
                    // Push into range
                    let targetR = curR;
                    if (curR < minR) targetR = minR;
                    if (curR > maxR) targetR = maxR;

                    const ratio = targetR / curR;
                    positions[ix] *= ratio;
                    positions[ix + 1] *= ratio;
                }
            }


            this.flowParticles.geometry.attributes.position.needsUpdate = true;
            this.flowParticles.geometry.attributes.color.needsUpdate = true;
        }

        // HERO PARTICLE — CONTINUOUS COMPRESSOR JOURNEY
        if (!this.heroParticle.visible && this.currentScene >= 1) {
            this.heroParticle.visible = true;
            this.heroParticle.position.set(0.8, 0.0, 0.0); // Start at Intake Face
            this.heroParticle.scale.setScalar(0.8);
        }

        const hp = this.heroParticle.position;
        const hs = this.heroState;
        const dtS = dt;

        // --- PHASE VALUES ---
        let omega = 0;
        let axialSpeed = 0;
        let targetRadius = 0.8;

        if (hs.phase === "idle") {
            hp.z = 0.0;
            hs.heat = 0.0;
            targetRadius = 0.8;
            omega = 0;
        }
        else if (hs.phase === "stage1") {
            // Scene 2: Move to 0.10m inside (Z=1.20)
            if (hp.z < 1.20) axialSpeed = 2.0;
            else { hp.z = 1.20; axialSpeed = 0; }
            targetRadius = 0.8;
            hs.heat = 0.0;
            omega = 2.0; // MATCHED BASELINE (Faster than 0.5 drift)
        }
        else if (hs.phase === "lpc_transit") {
            // Scene 3: Whirl Stage-by-Stage (LPC)
            // HUB TAPER: 0.35 -> 0.58.
            // PARTICLE TRAJECTORY: Follow mid-span (approx).
            // Start: (1.0+0.35)/2 = 0.675. End: (1.0+0.58)/2 = 0.79.
            // Taper 0.7 -> 0.8.
            const progress = hs.stageIndex / 8;
            targetRadius = 0.7 + progress * 0.1;

            // Pressure Build-Up: 0.1 -> 0.3
            hs.heat = 0.1 + progress * 0.2;

            if (this.compressorData && this.compressorData.LPC && hs.stageIndex < this.compressorData.LPC.length) {
                const stage = this.compressorData.LPC[hs.stageIndex];
                const dist = stage.z - hp.z;

                if (dist > 0.05) {
                    // Move
                    axialSpeed = 1.0;
                    omega = 2.0;
                    hs.spinProgress = 0;
                } else {
                    // Action
                    hp.z = stage.z;
                    axialSpeed = 0;

                    if (stage.type === 'rotor') {
                        omega = 2.0; // Constant RPM (N1 Spool)
                        hs.spinProgress += omega * dtS;

                        if (hs.spinProgress >= Math.PI * 2) {
                            hs.stageIndex++;
                            hs.spinProgress = 0;
                        }
                    } else {
                        omega = 0;
                        hs.spinProgress += dtS * 4.0;
                        if (hs.spinProgress > 2.0) {
                            hs.stageIndex++;
                            hs.spinProgress = 0;
                        }
                    }
                }
            } else {
                // FINISHED LPC: Hold at last stage (Don't loop)
                // Wait for User "Next" -> leads to hpc_transit
                if (this.compressorData.LPC.length > 0) {
                    hp.z = this.compressorData.LPC[this.compressorData.LPC.length - 1].z;
                }
                omega = 0;
            }
        }
        else if (hs.phase === "hpc_transit") {
            // Scene 4: HPC Transit (Step-by-Step)

            if (this.compressorData && this.compressorData.HPC && hs.stageIndex < this.compressorData.HPC.length) {
                const stage = this.compressorData.HPC[hs.stageIndex];
                const dist = stage.z - hp.z;

                // 1. RADIUS: Constant 0.8 (Matches LPC height of ~0.42m visual)
                targetRadius = 0.8;

                // 2. HEAT: Start at LPC End (0.3) -> Max (0.9)
                const hpcProgress = hs.stageIndex / 20;
                hs.heat = 0.3 + hpcProgress * 0.6;

                if (dist > 0.05) {
                    // Move Phase
                    axialSpeed = 1.0;

                    // DUCT LOGIC: If gap is large (Transition Duct), reduce swirl
                    if (dist > 0.25) {
                        omega = 0.5; // Straightening in duct
                    } else {
                        omega = 5.0; // N2 Spin (Slightly faster 5.0 rad/s)
                    }

                    hs.spinProgress = 0;
                } else {
                    // Action Phase
                    hp.z = stage.z;
                    axialSpeed = 0;

                    if (stage.type === 'rotor') {
                        omega = 5.0; // N2 Speed 5.0
                        hs.spinProgress += omega * dtS;

                        if (hs.spinProgress >= Math.PI * 2) {
                            hs.stageIndex++;
                            hs.spinProgress = 0;
                        }
                    } else {
                        omega = 0.5; // Stator Drift (Keep alive)
                        hs.spinProgress += dtS * 4.0;
                        if (hs.spinProgress > 0.8) { // Faster Stator Passage
                            hs.stageIndex++;
                            hs.spinProgress = 0;
                        }
                    }
                }
            } else {
                // Finished HPC
                // Dont drop to 0.4 (Core). Stay high (0.8).
                targetRadius = 0.8;
                omega = 4.0; // Idle spin at end

                // Hold Z at last blade if known, else hold current
                if (this.compressorData.HPC.length > 0) {
                    hp.z = this.compressorData.HPC[this.compressorData.HPC.length - 1].z;
                }
            }
        }
        else if (hs.phase === "lpc_end") {
            // Legacy fallback (Unlikely hit now)
            hp.z = 3.0; omega = 0.5; targetRadius = 0.75; hs.heat = 0.3;
        }
        else if (hs.phase === "hpc") {
            // TODO: Apply similar logic for HPC if needed, or keep fast for now
            omega = 6.0;
            axialSpeed = 1.2;
            targetRadius = 0.4;
            hs.heat += 0.3 * dtS;
        }
        else if (hs.phase === "exit") {
            omega = 3.0;
            axialSpeed = 5.0;
            targetRadius = 0.3;
            hs.heat += 0.1 * dtS;
        }

        // --- APPLY MOTION ---
        // FLOW SCALAR (Hero)
        let flowScalar = 0.0;
        if (this.physics && this.physics.state) {
            flowScalar = this.physics.state.rpm / 100.0;
        }

        if (flowScalar > 0.01) {
            hs.theta += omega * dtS * flowScalar;
            hp.x = Math.cos(hs.theta) * targetRadius;
            hp.y = Math.sin(hs.theta) * targetRadius;
            hp.z += axialSpeed * dtS * flowScalar;
        }

        // --- COLOR = HEAT ---
        // --- COLOR = HEAT ---
        // Link to Local Temperature (Approximate based on Z)
        let localTempNorm = 0.0;
        if (hp.z < 1.1) localTempNorm = 0.0; // Intake
        else if (hp.z < 6.0) { // Compressor
            // T3 normalization (300 -> 900K)
            const t3 = (this.physics && this.physics.stations) ? this.physics.stations[3].T : 300;
            localTempNorm = (t3 - 300) / 600.0 * (hp.z / 6.0);
        } else if (hp.z < 9.0) { // Combustor
            // T4 normalization (900 -> 1800K)
            const t4 = (this.physics && this.physics.stations) ? this.physics.stations[4].T : 300;
            localTempNorm = (t4 - 300) / 1500.0;
        } else { // Turbine/Exhaust
            // T5 normalization
            const t5 = (this.physics && this.physics.stations) ? this.physics.stations[5].T : 300;
            localTempNorm = (t5 - 300) / 1000.0;
        }

        hs.heat = Math.min(Math.max(localTempNorm, 0), 1.0);

        this.heroParticle.material.color.setHSL(
            0.6 - hs.heat * 0.6, // Blue (0.6) -> Red (0.0)
            1.0,
            0.5
        );
    }

    dispose() {
        window.removeEventListener('resize', this.onResize);
        if (this.renderer) {
            this.renderer.domElement.removeEventListener('mousedown', this.onMouseDownBound);
            this.renderer.domElement.removeEventListener('mouseup', this.onMouseUpBound);
        }
        cancelAnimationFrame(this.animationId);
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        if (this.textWidget) this.textWidget.remove();
        if (this.debugWidget) this.debugWidget.remove();
    }
}
