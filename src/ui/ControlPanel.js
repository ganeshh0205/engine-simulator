import { LearningData } from '../data/LearningData.js';

export class ControlPanel {
    constructor(physics, sceneManager) {
        this.physics = physics;
        this.sceneManager = sceneManager;
        this.visible = false;
        // ... rest of constructor ...

        // Create Main Panel (Hidden by Default)
        this.panel = document.createElement("div");
        Object.assign(this.panel.style, {
            position: "absolute",
            top: "70px", // Below the button (20px top + 40px height + 10px gap)
            right: "20px",
            width: "340px", // Slightly wider
            padding: "20px",
            background: "rgba(0, 0, 0, 0.9)", // Darker
            color: "#0f0",
            fontFamily: "'Courier New', monospace",
            border: "2px solid #0f0",
            borderRadius: "8px",
            boxShadow: "0 0 20px rgba(0, 255, 0, 0.2)",
            zIndex: "100",
            display: "none",
            maxHeight: "80vh",
            overflowY: "auto"
        });

        // Prevent clicks on panel from propagating to Scene (which triggers Deselect -> Rebuild UI)
        this.panel.addEventListener("mousedown", (e) => e.stopPropagation());
        this.panel.addEventListener("click", (e) => e.stopPropagation());
        this.panel.addEventListener("dblclick", (e) => e.stopPropagation()); // Be safe

        // Create Toggle Button
        this.toggleBtn = document.createElement("button");
        this.toggleBtn.innerText = "OPEN FLIGHT CONSOLE";
        Object.assign(this.toggleBtn.style, {
            position: "absolute",
            top: "20px",
            right: "20px",
            padding: "10px 20px",
            background: "#000",
            color: "#0f0",
            border: "1px solid #0f0",
            fontFamily: "'Courier New', monospace",
            fontWeight: "bold",
            cursor: "pointer",
            zIndex: "101"
        });

        this.toggleBtn.onclick = () => {
            this.visible = !this.visible;
            this.panel.style.display = this.visible ? "block" : "none";
            this.toggleBtn.innerText = this.visible ? "CLOSE CONSOLE" : "OPEN FLIGHT CONSOLE";
        };

        document.body.appendChild(this.toggleBtn);
        document.body.appendChild(this.panel);
        this.container = this.panel; // Shim to keep existing addX methods working using 'this.container'

        this.buildUI();
        this.startUpdateLoop();
    }

    buildUI() {
        this.showMainView();
    }

    clearUI() {
        // Remove all children except header/helpers? 
        // Easier to just empty the panel and re-add Header + InfoBox
        this.panel.innerHTML = "";
    }

    showMainView() {
        this.clearUI();

        // CSS Grid for Console
        // this.panel.style.display = "grid"; // Managed by Toggle
        this.panel.style.display = "grid";
        this.panel.style.gridTemplateColumns = "1fr 1fr";
        this.panel.style.gap = "10px";
        this.panel.style.width = "480px"; // Widen mainly

        // Header spans both
        const header = document.createElement("div");
        header.style.gridColumn = "1 / -1";
        header.innerText = "UNIFIED ENGINE CONSOLE";
        Object.assign(header.style, { borderBottom: "2px solid #0f0", marginBottom: "5px", textAlign: "center", fontWeight: "bold" });
        this.panel.appendChild(header);

        // === LEFT COLUMN: INPUTS ===
        const leftCol = document.createElement("div");
        Object.assign(leftCol.style, { display: "flex", flexDirection: "column", gap: "5px" });
        this.panel.appendChild(leftCol);

        // Helper to append to Left
        this.container = leftCol;

        // 0. ENGINE MODEL (REMOVED: Single Engine Mode Restored)
        // this.addSectionHeader("ENGINE MODEL");
        // [Dropdown Removed]

        // 1. FLIGHT CONDITIONS
        this.addSectionHeader("FLIGHT COND.");
        this.addSlider("Throttle", "%", 0, 100, this.physics.inputs.throttle, (v) => this.physics.inputs.throttle = v);
        this.addSlider("Velocity (Mach)", "M", 0, 2.0, this.physics.inputs.mach, (v) => this.physics.inputs.mach = v);
        this.addSlider("Altitude", "ft", 0, 50000, this.physics.inputs.altitude, (v) => this.physics.inputs.altitude = v);

        // 2. INLET MANUAL OVERRIDE
        this.addSectionHeader("INLET (MANUAL)");
        // Toggle for Manual Atmos
        // We'll just assume if they touch P/T sliders, we might switch? Or separate toggle.
        // Let's rely on Physics Auto unless we add inputs.
        // Adding simple Number Inputs for detailed Physics
        this.addInput("Inlet Press (P0)", "Pa", this.physics.inputs.ambientPress, (v) => {
            this.physics.inputs.manualAtmosphere = true;
            this.physics.inputs.ambientPress = parseFloat(v);
        });
        this.addInput("Inlet Temp (T0)", "K", this.physics.inputs.ambientTemp, (v) => {
            this.physics.inputs.manualAtmosphere = true;
            this.physics.inputs.ambientTemp = parseFloat(v);
        });

        // 3. FUEL & SYSTEM
        this.addSectionHeader("FUEL / SYSTEM");
        this.addInput("Fuel CV", "MJ/kg", this.physics.inputs.fuelCV / 1e6, (v) => this.physics.inputs.fuelCV = parseFloat(v) * 1e6);
        this.addInput("Target AFR", ":1", this.physics.inputs.afr, (v) => this.physics.inputs.afr = parseFloat(v));
        this.addInput("Inj. Press", "Bar", this.physics.inputs.injectionPressure, (v) => this.physics.inputs.injectionPressure = parseFloat(v));
        this.addSlider("Valve/Nozzle Area", "x", 0.5, 1.5, this.physics.inputs.nozzleArea, (v) => this.physics.inputs.nozzleArea = v);


        // === RIGHT COLUMN: OUTPUTS ===
        const rightCol = document.createElement("div");
        Object.assign(rightCol.style, { display: "flex", flexDirection: "column", gap: "5px" });
        this.panel.appendChild(rightCol);

        this.container = rightCol;

        // 1. PERFORMANCE
        this.addSectionHeader("PERFORMANCE");
        this.addDisplay("Thrust", "kN", "thrust-val");
        this.addDisplay("N1 RPM", "%", "rpm-val");
        this.addDisplay("Fuel Flow", "kg/s", "ff-val");
        this.addDisplay("TSFC", "g/kN.s", "tsfc-val"); // Display TSFC

        // 2. VIEW CONTROLS
        this.addSectionHeader("VISUAL ANALYSIS");
        const modes = ["Standard", "Wireframe", "Glass", "Clay", "Metallic", "UV", "HeatMap"];
        this.addDropdown("View Mode", modes, "Standard", (val) => {
            if (this.sceneManager.viewManager) {
                this.sceneManager.viewManager.setMaterialMode(val);
            }
        });

        // Section Cut Control
        this.addSectionHeader("INSPECTION");
        this.addToggle("Enable Section Cut", (active) => {
            if (this.sceneManager.viewManager) {
                this.sceneManager.viewManager.setSectionCut(active);
            }
        });

        this.addSlider("Cut Position", "m", -5, 5, 0, (val) => {
            if (this.sceneManager.viewManager) {
                this.sceneManager.viewManager.setSectionCutPosition(val);
            }
        });

        // 3. THERMODYNAMICS
        this.addSectionHeader("CYCLE ANALYSIS");
        this.addDisplay("Inlet Density", "kg/m3", "rho-val");
        this.addDisplay("Engine Press (P3)", "kPa", "p3-val");
        this.addDisplay("Exit Temp (EGT)", "K", "egt-val");
        this.addDisplay("Jet Velocity", "m/s", "vjet-val");

        // 3. TEST LAB (VERIFICATION)
        this.addSectionHeader("TEST LAB");
        const btnRow = document.createElement("div");
        btnRow.style.display = "flex"; btnRow.style.gap = "5px";

        const testBtn = document.createElement("button");
        testBtn.innerText = "RUN THROTTLE SWEEP";
        Object.assign(testBtn.style, {
            flex: "1", padding: "8px", background: "#333", color: "#0f0", border: "1px solid #0f0", cursor: "pointer", fontSize: "11px"
        });
        testBtn.onclick = () => this.runPerformanceTest();
        btnRow.appendChild(testBtn);
        this.container.appendChild(btnRow);

        // Restore container to panel (though addX uses this.container)
        this.container = this.panel;
    }

    async runPerformanceTest() {
        console.log("Starting Performance Sweep...");

        // Disable button
        // (Optional: visual feedback)

        const startInputs = { ...this.physics.inputs }; // Backup

        let report = "RPM (%) | THRUST (kN) | EGT (K) | TSFC\n";
        report += "---------------------------------------\n";

        // Perform Sweep
        for (let i = 0; i <= 100; i += 10) {
            // Set Input
            this.physics.inputs.throttle = i;

            // Sync Slider UI visually
            // We need to find the throttle slider. 
            // Since we don't have direct ref, we rely on the loop updating the slider? 
            // No, addSlider updates callback only. 
            // We'll just let the "Input" reflect it if we re-render?
            // Actually, sliders don't auto-update from model unless we bind them.
            // Our addSlider initializes with value, but doesn't listen to model changes.
            // That's a bi-directional binding gap.
            // For now, we just setting physics input is enough for the simulation.

            // Wait for Engine to Spool (Simulate time passing)
            // We await a real timeout to let the user SEE the engine spool up
            await new Promise(r => setTimeout(r, 200));

            // We also need to force the engine to 'catch up' physics-wise if we want instant steady state
            // But let's just let it run naturally? 200ms is too short for natural spool (takes 5s).
            // So we force-update physics 60 times instantly to simulate settling
            for (let t = 0; t < 60; t++) {
                this.physics.update(1.0 / 60.0);
            }

            const s = this.physics.state;
            const line = `${s.rpm.toFixed(1).padEnd(8)} | ${(s.thrust / 1000).toFixed(2).padEnd(11)} | ${s.egt.toFixed(0).padEnd(7)} | ${(s.tsfc * 1000 / 3600).toFixed(2)}`;
            report += line + "\n";
        }

        // Restore Inputs
        this.physics.inputs = startInputs;

        // Show Report
        this.showTestReport(report);
    }

    showTestReport(text) {
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.95)", border: "2px solid #0f0", padding: "20px",
            color: "#0f0", fontFamily: "monospace", whiteSpace: "pre", zIndex: "2000",
            boxShadow: "0 0 50px rgba(0,255,0,0.2)"
        });

        const h = document.createElement("h3");
        h.innerText = "PERFORMANCE SWEEP RESULTS";
        h.style.marginTop = "0";
        overlay.appendChild(h);

        const content = document.createElement("div");
        content.innerText = text;
        overlay.appendChild(content);

        const closeBtn = document.createElement("button");
        closeBtn.innerText = "CLOSE REPORT";
        Object.assign(closeBtn.style, {
            marginTop: "15px", padding: "5px 10px", background: "#0f0", color: "#000", border: "none", cursor: "pointer", fontWeight: "bold"
        });
        closeBtn.onclick = () => overlay.remove();
        overlay.appendChild(closeBtn);

        document.body.appendChild(overlay);
    }

    showComponentView(componentName, selectedObject) {
        this.clearUI();
        this.addHeader("COMPONENT: " + componentName.toUpperCase());

        // Back Button
        const backBtn = document.createElement("button");
        backBtn.innerText = "< BACK TO MAIN";
        Object.assign(backBtn.style, {
            width: "100%", padding: "5px", background: "#333", color: "#fff",
            border: "1px solid #555", cursor: "pointer", marginBottom: "15px"
        });
        backBtn.onclick = () => this.showMainView();
        this.panel.appendChild(backBtn);

        // Contextual Controls
        if (componentName === 'Compressor' || componentName === 'Turbine' || componentName === 'Fan') {
            this.addSectionHeader("Mechanical Tuning");

            // BLADE ANGLE
            this.addSlider("Blade Angle", "°", -10, 45, 12, (val) => {
                // Real-time update
                if (selectedObject) {
                    selectedObject.traverse((child) => {
                        // Check if it's a blade
                        // Names: "TurbineRotorBlade...", "CompressorBlade...", "Vane..."
                        if (child.name.includes("Blade") ||
                            child.name.includes("Vane") ||
                            child.name.includes("Rotor") // Catch-all for parts in a rotor group?
                        ) {
                            if (child.isMesh) {
                                // Reset then apply? Or just set rotation.y?
                                // Blades usually rotated on Y or X depending on setup.
                                // Turbine.js: blade.rotation.y = -0.5 (Angle of attack)
                                // Let's assume val is degrees, convert to radians.
                                const rad = val * (Math.PI / 180);
                                // We need to know the base rotation? 
                                // Or just set it. 
                                child.rotation.y = rad;
                            }
                        }
                    });
                }
            });

            // ROUGHNESS
            this.addSlider("Material Roughness", "", 0.0, 1.0, 0.4, (val) => {
                if (selectedObject) {
                    console.log("Updating Roughness on:", selectedObject.name, "to", val);
                    selectedObject.traverse((child) => {
                        if (child.isMesh && child.material) {
                            // some materials might be an array
                            if (Array.isArray(child.material)) {
                                child.material.forEach(m => m.roughness = val);
                            } else {
                                child.material.roughness = val;
                            }
                        }
                    });
                }
            });
        }
        else if (componentName === 'Combustor') {
            this.addSectionHeader("Reaction Control");
            this.addSlider("Ignition Timing", "ms", 0, 100, 50, (val) => {
                console.log("Ignition Timing Set:", val);
                // Future: adjust particle lifetime?
            });
            this.addSlider("Fuel Pressure", "psi", 50, 500, 120, (val) => {
                console.log("Fuel Pressure Set:", val);
                // Future: adjust flame size
            });
        }

        // Re-add InfoBox
        if (this.infoBox) this.panel.appendChild(this.infoBox);
        if (this.debugDiv) this.panel.appendChild(this.debugDiv);
    }

    addHeader(text) {
        const h = document.createElement('h2');
        h.innerText = text;
        Object.assign(h.style, {
            margin: '0 0 16px 0', fontSize: '16px', color: '#fff',
            borderBottom: '1px solid #333', paddingBottom: '8px'
        });
        (this.container || this.panel).appendChild(h);
    }

    addSectionHeader(text) {
        const h = document.createElement('h3');
        h.innerText = text;
        Object.assign(h.style, {
            margin: '16px 0 8px 0', fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '1px', color: '#888'
        });
        (this.container || this.panel).appendChild(h);
    }

    // ... Helpers (addSlider, addDisplay, addInput) - Kept same as before but ensured they append to this.panel

    addSlider(label, unit, min, max, initial, callback) {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '12px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.marginBottom = '4px';

        const l = document.createElement('span');
        l.innerText = label;

        // Manual Input for Value
        const valInput = document.createElement('input');
        valInput.type = 'number';
        valInput.value = initial.toFixed(1);
        // Style nicely
        Object.assign(valInput.style, {
            width: "50px", background: "#222", color: "#4caf50",
            border: "1px solid #333", fontSize: "11px", textAlign: "right"
        });

        const unitSpan = document.createElement('span');
        unitSpan.innerText = unit;
        unitSpan.style.marginLeft = "2px";

        const valContainer = document.createElement('div');
        valContainer.appendChild(valInput);
        valContainer.appendChild(unitSpan);

        row.appendChild(l);
        row.appendChild(valContainer);
        wrapper.appendChild(row);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.value = initial;
        slider.step = (max - min) / 100;
        slider.style.width = '100%';
        slider.style.accentColor = '#4caf50';

        // SYNC LOGIC
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            valInput.value = val.toFixed(1);
            callback(val);
        });

        valInput.addEventListener('change', (e) => {
            let val = parseFloat(e.target.value);
            if (val < min) val = min;
            if (val > max) val = max;
            slider.value = val;
            callback(val);
        });

        wrapper.appendChild(slider);
        (this.container || this.panel).appendChild(wrapper);
    }

    addDisplay(label, unit, id) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.borderBottom = '1px solid #333';
        row.style.padding = '6px 0';

        const l = document.createElement('span');
        l.innerText = label;

        const v = document.createElement('span');
        v.id = id;
        v.innerText = '-';
        v.style.fontFamily = 'Monaco, monospace';
        v.style.color = '#4caf50';

        row.appendChild(l);
        row.appendChild(v);
        (this.container || this.panel).appendChild(row);
    }

    addToggle(label, callback) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '8px';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.style.marginRight = '8px';
        input.addEventListener('change', (e) => callback(e.target.checked));

        const l = document.createElement('span');
        l.innerText = label;

        row.appendChild(input);
        row.appendChild(l);
        (this.container || this.panel).appendChild(row);
    }



    addDropdown(label, options, selected, callback) {
        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' });

        const l = document.createElement('span');
        l.innerText = label;

        const select = document.createElement('select');
        Object.assign(select.style, { background: '#222', color: '#0f0', border: '1px solid #0f0', padding: '2px' });

        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt;
            el.innerText = opt;
            if (opt === selected) el.selected = true;
            select.appendChild(el);
        });

        select.onchange = (e) => callback(e.target.value);

        row.appendChild(l);
        row.appendChild(select);
        (this.container || this.panel).appendChild(row);
    }

    addInput(label, unit, value, callback) {
        const row = document.createElement("div");
        Object.assign(row.style, { display: "flex", justifyContent: "space-between", fontSize: "12px", alignItems: "center" });

        const lbl = document.createElement("span");
        lbl.innerText = `${label}:`;

        const group = document.createElement("div");
        Object.assign(group.style, { display: "flex", gap: "5px" });

        const inp = document.createElement("input");
        inp.type = "number";
        inp.value = value;
        Object.assign(inp.style, { width: "60px", background: "#000", color: "#0f0", border: "1px solid #0f0" });

        inp.onchange = (e) => callback(e.target.value);

        const u = document.createElement("span");
        u.innerText = unit;

        group.appendChild(inp);
        group.appendChild(u);
        row.appendChild(lbl);
        row.appendChild(group);
        (this.container || this.panel).appendChild(row);
    }

    startUpdateLoop() {
        const update = () => {
            if (this.visible && this.physics && this.physics.state) {
                try {
                    const s = this.physics.state;
                    const setTxt = (id, txt) => {
                        const el = document.getElementById(id);
                        if (el) el.innerText = txt;
                    };

                    setTxt("rpm-val", s.rpm ? s.rpm.toFixed(1) : "0.0");
                    setTxt("thrust-val", s.thrust ? (s.thrust / 1000).toFixed(2) : "0.00");
                    setTxt("egt-val", s.egt ? s.egt.toFixed(0) : "288");

                    // NEW VALUES
                    setTxt("ff-val", s.fuelFlow ? s.fuelFlow.toFixed(3) : "0.000");
                    setTxt("tsfc-val", s.tsfc ? (s.tsfc * 1000 / 3600).toFixed(2) : "0.00"); // g/kN.s
                    setTxt("rho-val", s.airDensityInlet ? s.airDensityInlet.toFixed(3) : "1.225");
                    setTxt("p3-val", s.p3 ? (s.p3 / 1000).toFixed(1) : "101.3");
                    setTxt("vjet-val", s.exitVelocity ? s.exitVelocity.toFixed(1) : "0.0");
                } catch (e) {
                    console.error("Panel Update Error:", e);
                }
            }
            requestAnimationFrame(update);
        };
        update();
    }

    setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }

    // New Educational Info
    updateInfo(componentName) {
        // Switch context to component view
        this.showComponentView(componentName);

        // InfoBox is already re-added by showComponentView logic above? 
        // Partially. showComponentView calls `appendChild(this.infoBox)`.
        // But we need to ensure infoBox CONTENT is updated.

        if (!this.infoBox) {
            this.infoBox = document.createElement("div");
            Object.assign(this.infoBox.style, {
                marginTop: "15px", padding: "10px", background: "rgba(0, 50, 0, 0.4)",
                border: "1px solid #0f0", borderRadius: "4px", fontSize: "12px",
                color: "#0f0", minHeight: "80px"
            });
        }

        // Ensure it is attached to panel
        if (this.panel && !this.panel.contains(this.infoBox)) {
            this.panel.appendChild(this.infoBox);
        }

        // Set Text Content
        // ... (Switch case remains same)
        let title = componentName.toUpperCase();
        let desc = "";

        switch (componentName) {
            case 'Compressor':
                desc = "Compresses intake air to high pressure (P3). Rotating blades work on the air to increase energy density.";
                break;
            case 'Combustor':
                desc = "<strong>COMBUSTION PROCESS:</strong><br>1. <strong>Mixing:</strong> High-pressure air enters the Cans.<br>2. <strong>Ignition:</strong> Fuel is injected and ignited.<br>3. <strong>Expansion:</strong> Controlled explosion creates high-velocity gas.";
                break;
            case 'Turbine':
                desc = "Extracts energy from the hot exhaust stream to drive the Compressor and Fan via the central shaft.";
                break;
            case 'Nozzle':
                desc = "Accelerates exhaust gas to supersonic speeds to generate Thrust via Newton's Third Law.";
                break;
            default:
                desc = "Function: Structural Support & Airflow Management.";
        }
        this.infoBox.innerHTML = `<strong>ANALYZING: ${title}</strong><br>${desc}`;

        if (!this.visible) {
            this.toggleBtn.click();
        }
    }

    setDebug(msg) {
        if (!this.debugDiv) {
            this.debugDiv = document.createElement("div");
            this.debugDiv.style.marginTop = "10px";
            this.debugDiv.style.color = "yellow";
            this.debugDiv.style.fontSize = "10px";
            this.panel.appendChild(this.debugDiv);
        }
        this.debugDiv.innerText = "> " + msg;
    }
}
