import * as THREE from "three";
import { Renderer } from "expo-three";
import { EngineFactory } from "../../src/engines/EngineFactory";
import { PhysicsEngine } from "./PhysicsEngine";

export class MobileSceneManager {
  constructor(gl, onProgress, onError) {
    this.gl = gl;
    this.onProgress = onProgress || console.log;
    this.onError = onError || console.error;

    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    this.width = width;
    this.height = height;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050505);

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    // Center the camera slightly better for the engine length (0 to 15)
    // Engine Center is approx x=7.5.
    this.camera.position.set(7.5, 5, 15);
    this.camera.lookAt(7.5, 0, 0);

    this.renderer = new Renderer({ gl });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(2);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.physicallyCorrectLights = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.loadingStep = 0;
    this.isReady = false;
    this.lastTime = performance.now();
  }

  // Called every frame to incrementally load components
  // preventing a single long-blocking frame that freezes the UI
  initStep() {
    try {
      switch (this.loadingStep) {
        case 0:
          this.onProgress("Loading Lights & Grid...");
          this.addLights();
          const grid = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
          grid.position.y = -2.0;
          this.scene.add(grid);
          this.loadingStep++;
          break;

        case 1:
          this.onProgress("Initializing Physics...");
          this.physics = new PhysicsEngine();
          this.physics.inputs.throttle = 20.0;
          this.loadingStep++;
          break;

        case 2:
          this.onProgress("Building Engine (Geometry)...");
          this.engine = EngineFactory.createTurbojet();
          this.scene.add(this.engine);
          this.loadingStep++;
          break;

        case 3:
          this.onProgress("Ready!");
          this.isReady = true;
          break;
      }
    } catch (e) {
      this.onError(e);
    }
  }

  addLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    keyLight.position.set(10, 10, 5);
    this.scene.add(keyLight);
    const rimLight = new THREE.SpotLight(0x4455ff, 5.0);
    rimLight.position.set(-5, 0, -5);
    rimLight.lookAt(0, 0, 0);
    this.scene.add(rimLight);
    const bottomLight = new THREE.DirectionalLight(0x222222, 1.0);
    bottomLight.position.set(0, -10, 0);
    this.scene.add(bottomLight);
  }

  updateCameraTransform(deltaX, deltaY, scale) {
    // ... (Existing touch logic)
    // We might need to base this off a "target" if we want orbit controls around specific parts
    // For now, keeping simple pan/zoom
    const offset = new THREE.Vector3();
    offset.copy(this.camera.position).sub(this.target || new THREE.Vector3(0, 0, 0));
    // ... (rest is fine for basic interaction)

    // Simplification for reliability:
    // Just map direct movement for now
    this.camera.position.x -= deltaX * 0.05;
    this.camera.position.y += deltaY * 0.05;
    this.camera.position.z -= scale * 0.1;
  }

  setScenario(name) {
    console.log("Setting Scenario:", name);
    // Move Camera to focus on specific sections
    // Engine is roughly 0 to 15 along X axis

    const targets = {
      'default': { pos: [7.5, 5, 15], look: [7.5, 0, 0] },
      'intake': { pos: [-5, 2, 8], look: [0, 0, 0] },     // Looking into the front
      'compressor': { pos: [4, 4, 10], look: [4, 0, 0] }, // Mid-front
      'combustion': { pos: [8, 4, 10], look: [8, 0, 0] }, // Mid-rear
      'turbine': { pos: [12, 4, 10], look: [12, 0, 0] },  // Rear
      'nozzle': { pos: [18, 5, 10], look: [15, 0, 0] }    // Exhaust
    };

    const t = targets[name] || targets['default'];

    // GSAP would be nice, but simple lerp/set is Safer for RN context right now
    this.camera.position.set(...t.pos);
    this.camera.lookAt(...t.look);

    // Store target for controls to orbit around (if implemented later)
    this.target = new THREE.Vector3(...t.look);
  }

  resize(width, height) {
    if (!width || !height) return;
    this.width = width;
    this.height = height;

    // update renderer
    this.renderer.setSize(width, height);

    // update camera
    const aspect = width / height;
    this.camera.aspect = aspect;

    // Smart FOV: Maintain Horizontal FOV on Portrait to fit Engine
    // Similar to Web LabScene logic
    if (aspect < 1.0) {
      // Portrait Mode: Increase Vertical FOV to keep Horizontal FOV wide enough
      // Formula: fov = base / aspect. 
      this.camera.fov = 70 / Math.max(0.5, aspect);
    } else {
      this.camera.fov = 60;
    }

    this.camera.updateProjectionMatrix();
  }

  render() {
    // Check for resize
    const { drawingBufferWidth: width, drawingBufferHeight: height } = this.gl;
    if (width !== this.width || height !== this.height) {
      this.resize(width, height);
    }

    // If not ready, run initialization steps instead of rendering
    if (!this.isReady) {
      this.initStep();
      this.renderer.render(this.scene, this.camera); // Render loading state
      this.gl.endFrameEXP();
      return;
    }

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.physics) {
      this.physics.update(dt);
      const currentRPM = this.physics.state.rpm;
      if (this.engine) {
        this.engine.traverse((obj) => {
          if (obj.name === "Compressor" || obj.name === "Turbine") {
            obj.params.rpm = (currentRPM / 100) * 8000;
          }
          if (typeof obj.update === "function") {
            obj.update(dt, this.physics);
          }
        });
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.gl.endFrameEXP();
  }
}
