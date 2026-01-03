import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EngineFactory } from "../engines/EngineFactory.js";
import { InteractionManager } from "./InteractionManager.js";
import { ViewManager } from "./ViewManager.js";
import { PhysicsEngine } from "./PhysicsEngine.js";
import { ParticleSystem } from "../effects/ParticleSystem.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ControlPanel } from "../ui/ControlPanel.js";
import { SimControls } from "../ui/SimControls.js";
import { CombustionShader } from "../effects/FlameShader.js";
import { Nacelle } from "../components/Nacelle.js";

export class SceneManager {
  constructor(container, onExit) {
    console.log("SceneManager: CONSTRUCTOR START");
    console.log("EngineFactory Import:", EngineFactory);
    this.container = container;
    this.onExit = onExit; // Callback for exiting simulation

    // 0. Scene Setup (Must be first)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);

    /* ... */
    // 1. Physics Engine
    this.physics = new PhysicsEngine();
    this.physics.inputs.throttle = 20.0;

    // 2. Visual Effects (Particle Flow)
    this.particleSystem = new ParticleSystem(20000); // Dense particles
    this.scene.add(this.particleSystem);

    // Flame Setup
    this.flames = [];
    const flameGroup = new THREE.Group();
    const flameCount = 8;
    const flameRadius = 0.20;
    const midRadius = (0.45 + 1.0) / 2;
    const singleFlameGeo = new THREE.CylinderGeometry(flameRadius, flameRadius, 1.8, 16, 1, true);
    singleFlameGeo.rotateZ(-Math.PI / 2);
    const uvAttribute = singleFlameGeo.attributes.uv;
    for (let i = 0; i < uvAttribute.count; i++) {
      const u = uvAttribute.getX(i);
      const v = uvAttribute.getY(i);
      uvAttribute.setXY(i, v, u);
    }
    this.flameMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uThrottle: { value: 0 },
        uAFR: { value: 0.5 }
      },
      vertexShader: CombustionShader.vertexShader,
      fragmentShader: CombustionShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    for (let i = 0; i < flameCount; i++) {
      const theta = (i / flameCount) * Math.PI * 2;
      const mesh = new THREE.Mesh(singleFlameGeo, this.flameMat);
      const y = Math.cos(theta) * midRadius;
      const z = Math.sin(theta) * midRadius;
      mesh.position.set(0, y, z);
      flameGroup.add(mesh);
    }
    flameGroup.position.set(5.7, 0, 0);
    this.flameMesh = flameGroup;
    this.flameMesh.name = "CombustionFlames";

    // 3. Scene & Camera
    // Scene initialized at top
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(10, 5, 15);

    // 4. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    // 5. Post-Processing
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.2, 0.95);
    this.composer.addPass(bloomPass);

    // 6. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 80;

    // 7. Lighting
    this.addLights();

    // 8. ENGINE CREATION (Direct)
    console.log("Creating Standard Turbojet...");
    this.engine = EngineFactory.createTurbojet();

    // Add Nacelle (Outer Casing)
    // Estimate length from components or use standard
    this.nacelle = new Nacelle({ length: 4.8, radius: 1.15, opacity: 0.15 });
    // Adjust position to center over the engine core
    // Engine starts around x=0. Nacelle x=-0.5.
    this.engine.add(this.nacelle);

    this.scene.add(this.engine);

    // Context: Grid & Floor
    const grid = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    grid.position.y = -2.0; // Below the engine
    this.scene.add(grid);

    // Physics Config for Turbojet
    this.physics.design.bypassRatio = 0.0;
    this.physics.design.massFlow = 15.0;
    this.physics.design.cpr = 12.0;

    this.scene.add(this.flameMesh);
    this.scene.add(this.flameMesh);
    // this.scene.add(this.particles); // Removed

    const centerX = this.engine.totalLength ? this.engine.totalLength / 2 : 2.0;
    this.controls.target.set(centerX, 0, 0);
    this.camera.lookAt(centerX, 0, 0);

    // 9. Managers
    this.viewManager = new ViewManager(this.engine, this.renderer, this.physics);
    this.viewManager.addAuxiliary(this.particleSystem);
    this.viewManager.addAuxiliary(this.flameMesh);

    this.interactionManager = new InteractionManager(this.camera, this.renderer);
    this.interactionManager.setInteractables(this.engine.children);
    this.interactionManager.setViewManager(this.viewManager);
    this.interactionManager.setFocusHandler((obj) => this.focusCamera(obj));

    // NEW: Manual Sim Controls (Air/Fuel/Ignition)
    this.simState = { airflow: false, fuel: false, ignition: false };
    this.simControls = new SimControls(this.container, (state) => {
      this.simState = state;
    });

    // PASS onExit to ControlPanel
    this.controlPanel = new ControlPanel(this.physics, this, () => {
      // Handle Exit Logic
      this.dispose();
      if (this.onExit) this.onExit();
    });
    this.interactionManager.setControlPanel(this.controlPanel);

    this.lastTime = performance.now();
    this.resizeHandler = this.onWindowResize.bind(this);
    this.keyDownHandler = this.onKeyDown.bind(this);
    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("keydown", this.keyDownHandler);
  }

  dispose() {
    this.isDisposed = true; // Stop Loop flag

    // Stop Loop
    if (this.rafId) cancelAnimationFrame(this.rafId);

    // Cleanup DOM
    this.renderer.domElement.remove();
    this.controlPanel.dispose();
    if (this.simControls && this.simControls.container) this.simControls.container.remove();

    // Remove Listeners
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("keydown", this.keyDownHandler);
  }

  // Removed createEngine / switchEngine / setupSwapping (Simplification)


  /* =======================
     Lighting
  ======================= */
  addLights() {
    // Ambient - subtle fill
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);

    // Key Light - Warm Sun
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    keyLight.position.set(10, 10, 5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    // Rim Light - Cool Blue (Cyberpunk feel / Sky reflection)
    const rimLight = new THREE.SpotLight(0x4455ff, 5.0);
    rimLight.position.set(-5, 0, -5);
    rimLight.lookAt(0, 0, 0);
    this.scene.add(rimLight);

    // Bottom Fill - Bounce light
    const bottomLight = new THREE.DirectionalLight(0x222222, 1.0);
    bottomLight.position.set(0, -10, 0);
    this.scene.add(bottomLight);
  }

  /* =======================
     Loop
  ======================= */
  start() {
    this.animate();
  }

  animate() {
    if (this.isDisposed) return;
    this.rafId = requestAnimationFrame(this.animate.bind(this));

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // 1. Update Physics
    this.physics.update(dt);
    const currentRPM = this.physics.state.rpm;

    // UI Updates - Handled by ControlPanel internal loop
    // if (this.ui.rpmVal) this.ui.rpmVal.innerText = currentRPM.toFixed(1) + '%';
    // if (this.ui.thrustVal) {
    //   const thrustKN = this.physics.state.thrust / 1000;
    //   this.ui.thrustVal.innerText = thrustKN.toFixed(2) + ' kN';
    // }

    // Update Particle System
    if (this.particleSystem) {
      const state = this.simState || { airflow: true, fuel: true, ignition: true };
      this.particleSystem.update(dt, currentRPM, this.physics, state);
    }

    // Update Flame Shader
    if (this.flameMat) {
      if (this.simState && this.flameMesh) {
        // Ignition requires Fuel + Spark
        this.flameMesh.visible = this.simState.fuel && this.simState.ignition;
      }
      this.flameMat.uniforms.uTime.value += dt;
      this.flameMat.uniforms.uThrottle.value = this.physics.state.rpm / 100.0;

      // Normalize AFR for color (10:1 Rich -> 0.0, 60:1 Lean -> 1.0)
      // Input range: 10 to 100
      const afrNorm = THREE.MathUtils.clamp((this.physics.inputs.afr - 15) / 45.0, 0, 1);
      this.flameMat.uniforms.uAFR.value = afrNorm;

      // Flicker intensity with RPM random
      // handled in shader noise
    }

    // 2. Update Visuals & Heat Glow
    const t4 = this.physics.stations[4].T; // Combustor Temp

    // ...

    // Camera Animation
    this.updateCamera(dt);
    const t5 = this.physics.stations[5].T; // Turbine Temp

    // Helper: Blackbody Radiation Approximation (Kelvin -> RGB)
    // Accurate Planckian locus approximation for heat glow
    const getHeatColor = (temp, outputColor) => {
      const color = outputColor || new THREE.Color(0x000000);

      // Below 500C (773K) metals don't glow much in visible spectrum
      if (temp < 773) {
        color.setRGB(0, 0, 0);
        return color;
      }

      // Normalize temperature for an approximated gradient
      // 800K (Dull Red) -> 3000K (White Hot)
      // This is a simplified artistic ramp that looks "hot"
      // Real blackbody formulas are complex, we use a gradient approximation.

      const t = THREE.MathUtils.clamp((temp - 800) / 1200, 0, 1); // 0.0 at 800K, 1.0 at 2000K

      // Red channel saturates quickly
      let r = THREE.MathUtils.smoothstep(t, 0.0, 0.3) * 1.5;

      // Green comes in later (Orange/Yellow)
      let g = THREE.MathUtils.smoothstep(t, 0.2, 0.7) * 0.8;

      // Blue comes in only at very high temps (White)
      let b = THREE.MathUtils.smoothstep(t, 0.6, 1.0) * 0.6;

      // Scale brightness (HDR) - Emissive intensity handles the "Pop"
      // But we prevent R,G,B from exceeding 1.0 strictly here since Color expects 0-1
      // We rely on emissiveIntensity > 1.0 for the bloom
      color.setRGB(
        Math.min(r, 1.0),
        Math.min(g, 1.0),
        Math.min(b, 1.0)
      );

      return color;
    };

    const combustorGlow = getHeatColor(t4);
    const turbineGlow = getHeatColor(t5);

    if (this.engine) {
      this.engine.traverse((obj) => {
        // Propagate RPM
        if (obj.name === "Compressor" || obj.name === "Turbine") {
          obj.params.rpm = (currentRPM / 100) * 8000;
        }

        // Apply Heat Glow
        if (obj.name === "Combustor") {
          if (obj.linerMats) {
            obj.linerMats.forEach(mat => mat.emissive.copy(combustorGlow));
          } else if (obj.linerMat) {
            obj.linerMat.emissive.copy(combustorGlow);
          }
        }
        if (obj.name === "Turbine" && obj.rotorMat) {
          obj.rotorMat.emissive.copy(turbineGlow);
        }
        if (obj.name === "Nozzle") {
          // Glow the Exhaust Cone
          if (obj.coneMat) {
            const nozzleGlow = getHeatColor(t5);
            obj.coneMat.emissive.copy(nozzleGlow);
          }
        }

        if (typeof obj.update === "function") {
          obj.update(dt, this.physics);
        }
      });
    }

    // View Manager (Animation for Explode)
    if (this.viewManager) this.viewManager.update(dt);

    this.interactionManager.update();

    this.controls.update();
    // this.renderer.render(this.scene, this.camera);
    this.composer.render();
  }

  /* =======================
     Input
  ======================= */
  onKeyDown(event) {
    // Toggle Exploded View with 'E' or Space
    if (event.code === "KeyE" || event.code === "Space") {
      this.viewManager.toggleExploded();
    }

    // Throttle Control (Temporary)
    if (event.code === "KeyT") {
      if (this.physics.inputs.throttle < 50) {
        console.log("Throttle: 100% (Takeoff)");
        this.physics.inputs.throttle = 100.0;
      } else {
        console.log("Throttle: 20% (Idle)");
        this.physics.inputs.throttle = 20.0;
      }
    }
  }

  focusCamera(targetObject) {
    if (!targetObject) return;

    // Get World Position
    const targetPos = new THREE.Vector3();
    targetObject.getWorldPosition(targetPos);

    // Maintain current offset
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);

    this.targetCameraCenter = targetPos.clone();
    this.targetCameraPos = targetPos.clone().add(offset);

    this.isCameraAnimating = true;
  }

  updateCamera(dt) {
    if (this.isCameraAnimating && this.targetCameraCenter && this.targetCameraPos) {
      const speed = 5.0 * dt;
      this.controls.target.lerp(this.targetCameraCenter, speed);
      this.camera.position.lerp(this.targetCameraPos, speed);

      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.05) {
        this.isCameraAnimating = false;
      }
    }
  }

  /* =======================
     Tutorial Support
  ======================= */
  cleanup() {
    if (this.viewManager) {
      this.viewManager.resetSubExplosion();
      this.viewManager.isExploded = false;
    }
  }

  resetCamera() {
    this.targetCameraCenter = new THREE.Vector3(0, 0, 0);
    this.targetCameraPos = new THREE.Vector3(10, 5, 15);
    this.isCameraAnimating = true;
  }

  getComponentByName(name) {
    if (!this.engine) return null;
    return this.engine.getObjectByName(name);
  }

  /* =======================
     Resize
  ======================= */
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
}
