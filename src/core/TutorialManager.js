import * as THREE from "three";

export class TutorialManager {
    constructor(sceneManager) {
        this.scene = sceneManager;
        this.isActive = false;
        this.stepIndex = 0;
        this.timer = 0;
        this.isAuto = false;

        this.steps = [
            {
                title: "SYSTEM INITIALIZATION",
                text: "INITIATING DEEP SCAN Analysis sequence started.\nTarget: High-Bypass Turbofan (Simulated Turbojet Core).",
                duration: 4.0,
                camera: { pos: new THREE.Vector3(15, 5, 15), target: new THREE.Vector3(5, 0, 0) },
                action: () => {
                    this.scene.resetCamera();
                    if (this.scene.viewManager) this.scene.viewManager.resetIsolation();
                }
            },
            {
                title: "PHASE 1: AIR INTAKE",
                text: "Analysis: Fluid enters at Mach 0.5.\nThe Diffuser slows airflow to increase static pressure before the compressor face.\n\nStatus: LAMINAR FLOW",
                duration: 6.0,
                camera: { pos: new THREE.Vector3(2, 2, 5), target: new THREE.Vector3(0, 0, 0) },
                action: () => {
                    this.isolate("Intake");
                }
            },
            {
                title: "PHASE 2: COMPRESSION",
                text: "Analysis: 12-Stage Axial Compressor.\nWork is input to the fluid. Pressure rises 20x. Temperature rises to 600°C simply by squeezing air atoms together.",
                duration: 7.0,
                camera: { pos: new THREE.Vector3(5, 3, 5), target: new THREE.Vector3(3, 0, 0) },
                action: () => {
                    this.isolate("Compressor");
                }
            },
            {
                title: "PHASE 3: COMBUSTION",
                text: "CRITICAL REACTION DETECTED.\nFuel (Jet A-1) injected. Auto-ignition occurs. Chemical potential becomes fluid enthalpy.\n\nTemp: 2200°C (3900°F).",
                duration: 7.0,
                camera: { pos: new THREE.Vector3(7, 2, 4), target: new THREE.Vector3(5.5, 0, 0) },
                action: () => {
                    this.isolate("Combustor");
                }
            },
            {
                title: "PHASE 4: EXPANSION & EXHAUST",
                text: "Energy Extraction. The Turbine harvests work to drive the Compressor.\nThe remaining energy accelerates through the Nozzle to supersonic speed.\n\nOutput: THRUST.",
                duration: 7.0,
                camera: { pos: new THREE.Vector3(10, 2, 5), target: new THREE.Vector3(8, 0, 0) },
                action: () => {
                    this.isolate("Turbine");
                    setTimeout(() => this.isolate("Nozzle"), 3500);
                }
            },
            {
                title: "ANALYSIS COMPLETE",
                text: "System is nominal. Use the Flight Console to manipulate variables manually.",
                duration: 5.0,
                camera: { pos: new THREE.Vector3(10, 5, 15), target: new THREE.Vector3(5, 0, 0) },
                action: () => {
                    this.scene.viewManager.resetIsolation();
                    this.scene.viewManager.toggleExploded();
                }
            }
        ];
    }

    startCinematic() {
        this.isActive = true;
        this.stepIndex = 0;
        this.isAuto = true;
        this.createOverlay();
        this.runStep();
    }

    stop() {
        this.isActive = false;
        this.isAuto = false;
        if (this.overlay) this.overlay.remove();
        if (this.scene.viewManager) this.scene.viewManager.resetIsolation();
    }

    runStep() {
        if (this.stepIndex >= this.steps.length) {
            this.stop();
            return;
        }

        const step = this.steps[this.stepIndex];
        this.updateOverlay(step);

        // Execute Action
        if (step.action) step.action();

        // Camera Move (Instant Snap for now, smooth requires loop)
        if (step.camera) {
            this.scene.camera.position.copy(step.camera.pos);
            this.scene.controls.target.copy(step.camera.target);
            this.scene.controls.update();
        }

        // Set Timer
        this.timer = step.duration;
    }

    update(dt) {
        if (!this.isActive || !this.isAuto) return;

        this.timer -= dt;
        if (this.timer <= 0) {
            this.stepIndex++;
            this.runStep();
        }

        // Progress Bar
        if (this.overlay && this.steps[this.stepIndex]) {
            const total = this.steps[this.stepIndex].duration;
            const current = total - this.timer;
            const pct = (current / total) * 100;
            this.progressBar.style.width = pct + "%";
        }
    }

    isolate(name) {
        if (this.scene.viewManager) {
            const obj = this.scene.getComponentByName(name);
            if (obj) this.scene.viewManager.isolate(obj);
        }
    }

    createOverlay() {
        if (this.overlay) this.overlay.remove();

        this.overlay = document.createElement("div");
        Object.assign(this.overlay.style, {
            position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)",
            width: "600px", padding: "20px",
            background: "rgba(10, 20, 30, 0.9)", border: "1px solid #00aaff",
            color: "#00aaff", fontFamily: "monospace",
            boxShadow: "0 0 30px rgba(0, 170, 255, 0.3)",
            backdropFilter: "blur(5px)", borderRadius: "10px",
            transition: "opacity 0.5s",
            zIndex: "2000"
        });

        this.title = document.createElement("h2");
        this.title.style.margin = "0 0 10px 0";
        this.title.style.textTransform = "uppercase";
        this.title.style.borderBottom = "1px solid #004488";
        this.title.style.fontSize = "18px";

        this.desc = document.createElement("p");
        this.desc.style.fontSize = "14px";
        this.desc.style.lineHeight = "1.5";
        this.desc.style.color = "#ffffff";
        this.desc.style.whiteSpace = "pre-line";

        this.progressBar = document.createElement("div");
        Object.assign(this.progressBar.style, {
            width: "0%", height: "4px", background: "#00aaff", marginTop: "15px",
            transition: "width 0.1s linear"
        });

        this.overlay.appendChild(this.title);
        this.overlay.appendChild(this.desc);
        this.overlay.appendChild(this.progressBar);
        document.body.appendChild(this.overlay);
    }

    updateOverlay(step) {
        this.title.innerText = step.title;
        this.desc.innerText = step.text;
    }
}
