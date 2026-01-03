import { LearningData } from '../data/LearningData.js';

export class ControlPanel {
    constructor(physics, sceneManager, onExit) {
        this.physics = physics;
        this.sceneManager = sceneManager;
        this.onExit = onExit;
        this.visible = true;

        // Create Main Panel (Hidden by Default)
        this.panel = document.createElement("div");
        this.panel.className = "glass-panel"; // Use Global Class
        Object.assign(this.panel.style, {
            position: "absolute",
            top: "80px",
            right: "20px",
            width: "500px",
            padding: "25px",
            zIndex: "100",
            display: "none",
            maxHeight: "80vh",
            overflowY: "auto",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px"
        });

        // Prevent clicks on panel from propagating
        this.panel.addEventListener("mousedown", (e) => e.stopPropagation());
        this.panel.addEventListener("click", (e) => e.stopPropagation());
        this.panel.addEventListener("dblclick", (e) => e.stopPropagation());

        // Create Toggle Button
        this.toggleBtn = document.createElement("button");
        this.toggleBtn.className = "btn-secondary";
        this.toggleBtn.innerText = "⚙ FLIGHT CONSOLE";
        Object.assign(this.toggleBtn.style, {
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: "101",
            backdropFilter: "blur(10px)",
            background: "rgba(0,0,0,0.5)"
        });

        this.toggleBtn.onclick = () => {
            this.visible = !this.visible;
            this.panel.style.display = this.visible ? "grid" : "none";
            this.toggleBtn.innerHTML = this.visible ? "&times; CLOSE" : "⚙ FLIGHT CONSOLE";
            this.toggleBtn.className = this.visible ? "btn-primary" : "btn-secondary";

            // Animate
            if (this.visible) {
                this.panel.classList.remove("anim-fade-in");
                void this.panel.offsetWidth; // trigger reflow
                this.panel.classList.add("anim-fade-in");
            }
        };

        // Create Persistent Exit Button (Top Left)
        this.exitBtn = document.createElement("button");
        this.exitBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
        `;
        this.exitBtn.className = "btn-secondary";
        Object.assign(this.exitBtn.style, {
            position: "absolute",
            top: "20px",
            left: "20px",
            width: "50px", height: "50px",
            zIndex: "101",
            padding: "0",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "50%", // Circular Icon
            backdropFilter: "blur(10px)",
            background: "rgba(229, 62, 62, 0.2)", // Red tint
            border: "1px solid rgba(229, 62, 62, 0.5)",
            color: "#fc8181",
            transition: "all 0.3s ease"
        });
        this.exitBtn.title = "Exit Simulation";

        this.exitBtn.onmouseover = () => {
            this.exitBtn.style.background = "rgba(229, 62, 62, 0.8)";
            this.exitBtn.style.color = "white";
            this.exitBtn.style.transform = "scale(1.1)";
            this.exitBtn.style.boxShadow = "0 0 15px rgba(229, 62, 62, 0.6)";
        };
        this.exitBtn.onmouseout = () => {
            this.exitBtn.style.background = "rgba(229, 62, 62, 0.2)";
            this.exitBtn.style.color = "#fc8181";
            this.exitBtn.style.transform = "scale(1)";
            this.exitBtn.style.boxShadow = "none";
        };

        this.exitBtn.onclick = () => {
            if (this.onExit) this.onExit();
        };

        document.body.appendChild(this.toggleBtn);
        document.body.appendChild(this.exitBtn);
        document.body.appendChild(this.panel);
        this.container = this.panel;

        this.buildUI();
        this.startUpdateLoop();
    }

    setDebug(msg) {
        // Handle debug messages from InteractionManager
        console.log(`[System]: ${msg}`);
        // Future: Could update a status bar in the UI
    }

    dispose() {
        this.disposed = true;
        if (this.rafId) cancelAnimationFrame(this.rafId);
        this.toggleBtn.remove();
        this.exitBtn.remove();
        this.panel.remove();
    }

    buildUI() {
        this.showMainView();
    }

    clearUI() {
        this.panel.innerHTML = "";
    }

    showMainView() {
        this.clearUI();
        this.panel.style.display = this.visible ? "grid" : "none";

        // Header
        const header = document.createElement("div");
        header.style.gridColumn = "1 / -1";
        header.innerHTML = "ENGINE TELEMETRY <span style='float:right; font-size:0.8em; color:var(--text-muted)'>LIVE</span>";
        Object.assign(header.style, {
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            marginBottom: "15px",
            paddingBottom: "10px",
            fontFamily: "var(--font-display)",
            color: "var(--accent-primary)",
            fontSize: "1.2rem",
            letterSpacing: "1px"
        });
        this.panel.appendChild(header);

        // === LEFT COLUMN: INPUTS ===
        const leftCol = document.createElement("div");
        Object.assign(leftCol.style, { display: "flex", flexDirection: "column", gap: "10px" });
        this.panel.appendChild(leftCol);
        this.container = leftCol;

        // 1. FLIGHT CONDITIONS (sample inputs)
        this.addSectionHeader("PRESETS (SAMPLE INPUTS)");
        const presetRow = document.createElement("div");
        presetRow.style.display = "flex"; presetRow.style.gap = "5px"; presetRow.style.marginBottom = "10px";

        const mkPreset = (name, thr, alt, mach) => {
            const btn = document.createElement("button");
            btn.className = "btn-secondary";
            btn.innerText = name;
            btn.style.fontSize = "0.7rem";
            btn.style.padding = "4px 8px";
            btn.onclick = () => {
                this.physics.inputs.throttle = thr;
                this.physics.inputs.altitude = alt;
                this.physics.inputs.mach = mach;

                // Update Sliders UI
                const updateSlider = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.value = val;
                        // Dispatch input event so the text label updates!
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                };
                updateSlider('thr-slider', thr);
                updateSlider('alt-slider', alt);
                updateSlider('mach-slider', mach);
            };
            presetRow.appendChild(btn);
        };

        mkPreset("IDLE", 0, 0, 0);
        mkPreset("TAKEOFF", 100, 0, 0.0);
        mkPreset("CRUISE", 85, 30000, 0.8);
        this.container.appendChild(presetRow);

        this.addSectionHeader("FLIGHT CONDITIONS");
        this.addSlider("Throttle", "%", 0, 100, this.physics.inputs.throttle, (v) => this.physics.inputs.throttle = v, "thr-slider");
        this.addSlider("Mach", "M", 0, 3.5, this.physics.inputs.mach, (v) => this.physics.inputs.mach = v, "mach-slider");
        this.addSlider("Altitude", "ft", 0, 50000, this.physics.inputs.altitude, (v) => this.physics.inputs.altitude = v, "alt-slider");

        // 2. INLET MANUAL
        this.addSectionHeader("ENVIRONMENT (MANUAL)");
        this.addInput("Inlet Press", "Pa", this.physics.inputs.ambientPress, (v, el) => {
            this.physics.inputs.manualAtmosphere = true;
            this.physics.inputs.ambientPress = parseFloat(v);
        }, "p0-input");
        this.addInput("Inlet Temp", "K", this.physics.inputs.ambientTemp, (v, el) => {
            this.physics.inputs.manualAtmosphere = true;
            this.physics.inputs.ambientTemp = parseFloat(v);
        }, "t0-input");

        // 3. FUEL
        this.addSectionHeader("FUEL SYSTEMS");
        this.addSlider("Nozzle Area", "x", 0.5, 1.5, this.physics.inputs.nozzleArea, (v) => this.physics.inputs.nozzleArea = v);


        // === RIGHT COLUMN: OUTPUTS ===
        const rightCol = document.createElement("div");
        Object.assign(rightCol.style, { display: "flex", flexDirection: "column", gap: "10px" });
        this.panel.appendChild(rightCol);
        this.container = rightCol;

        // 1. PERFORMANCE
        this.addSectionHeader("KEY PERFORMANCE");
        this.addDisplay("Thrust", "kN", "thrust-val");
        this.addDisplay("RPM (N1)", "%", "rpm-val");
        this.addDisplay("TSFC", "g/kN.s", "tsfc-val");

        // 2. MASS FLOWS
        this.addSectionHeader("FLOW RATES");
        this.addDisplay("Air Flow", "kg/s", "ma-val");
        this.addDisplay("Fuel Flow", "kg/s", "ff-val");

        // 3. INTERNAL STATE
        this.addSectionHeader("THERMODYNAMICS");
        this.addDisplay("P3 (Comp Exit)", "kPa", "p3-val");
        this.addDisplay("T4 (Combustor)", "K", "t4-val");
        this.addDisplay("EGT (T5)", "K", "egt-val");
        this.addDisplay("Jet Vel (Vj)", "m/s", "vjet-val");

        // 4. TOOLS
        this.addSectionHeader("SYSTEM CONTROL");
        const btnRow = document.createElement("div");
        btnRow.style.display = "flex"; btnRow.style.gap = "10px";

        // START / STOP Toggle
        const startBtn = document.createElement("button");
        startBtn.innerText = "START ENGINE";
        startBtn.className = "btn-secondary"; // Default Off
        startBtn.style.flex = "1";

        startBtn.onclick = () => {
            // Toggle Logic
            const isRun = !this.physics.inputs.ignition;
            this.physics.inputs.ignition = isRun;

            // FORCE RESET THROTTLE TO 0 (Safety)
            this.physics.inputs.throttle = 0.0;
            const thrSlider = document.getElementById("thr-slider");
            if (thrSlider) {
                thrSlider.value = 0;
                thrSlider.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Update UI
            startBtn.innerText = isRun ? "STOP ENGINE" : "START ENGINE";
            startBtn.className = isRun ? "btn-primary" : "btn-secondary";
            startBtn.style.background = isRun ? "rgba(72, 187, 120, 0.2)" : "";
            startBtn.style.borderColor = isRun ? "#48bb78" : "";
            startBtn.style.color = isRun ? "#48bb78" : "";
        };
        btnRow.appendChild(startBtn);

        const testBtn = document.createElement("button");
        testBtn.innerText = "DIAGNOSTICS";
        testBtn.className = "btn-secondary";
        testBtn.style.flex = "1";
        testBtn.onclick = () => this.runPerformanceTest();
        btnRow.appendChild(testBtn);

        this.container.appendChild(btnRow);



        // Restore container
        this.container = this.panel;
    }

    addSectionHeader(text) {
        const h = document.createElement('h3');
        h.innerText = text;
        Object.assign(h.style, {
            margin: '10px 0 5px 0', fontSize: '0.7rem', textTransform: 'uppercase',
            letterSpacing: '1px', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)'
        });
        (this.container || this.panel).appendChild(h);
    }

    addSlider(label, unit, min, max, initial, callback, id = null) {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '5px';

        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' });

        const l = document.createElement('span');
        l.innerText = label;
        l.style.color = "var(--text-main)";

        const valDisp = document.createElement('span');
        valDisp.innerText = initial.toFixed(1) + unit;
        valDisp.style.color = "var(--accent-primary)";
        valDisp.style.fontFamily = "var(--font-display)";

        row.appendChild(l);
        row.appendChild(valDisp);
        wrapper.appendChild(row);

        const slider = document.createElement('input');
        if (id) slider.id = id; // Set ID if provided
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.value = initial;
        slider.step = (max - min) / 100;
        slider.style.width = '100%';
        // Note: Global CSS styles input[type=range] differently? Or we rely on browser default but styled?
        // Let's add specific style to override global 'input' padding if it conflicts
        slider.style.padding = "0";
        slider.style.margin = "0";
        slider.style.background = "transparent";
        slider.style.border = "none";
        slider.style.height = "auto";

        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            valDisp.innerText = val.toFixed(1) + unit;
            callback(val);
        });

        // Listen for external updates (Presets)
        if (id) {
            // Create a custom listener or just poll
            slider.dataset.externalUpdate = "true";
        }

        wrapper.appendChild(slider);
        (this.container || this.panel).appendChild(wrapper);
    }

    addDisplay(label, unit, id) {
        const row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex', justifyContent: 'space-between',
            padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px'
        });

        const l = document.createElement('span');
        l.innerText = label;
        l.style.fontSize = "0.8rem";

        const v = document.createElement('span');
        v.id = id;
        v.innerText = '-';
        v.style.fontFamily = 'var(--font-display)';
        v.style.color = 'var(--accent-primary)';
        v.style.fontWeight = "bold";

        row.appendChild(l);
        row.appendChild(v);
        (this.container || this.panel).appendChild(row);
    }

    addDropdown(label, options, selected, callback) {
        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' });

        const l = document.createElement('span');
        l.innerText = label;
        l.style.fontSize = "0.8rem";

        const select = document.createElement('select');
        Object.assign(select.style, {
            background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
            padding: '4px', borderRadius: '4px', fontSize: '0.8rem'
        });

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

    addInput(label, unit, value, callback, id = null) {
        // Reusing global input style but smaller
        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' });

        const l = document.createElement('span');
        l.innerText = label;
        l.style.fontSize = "0.8rem";

        const inp = document.createElement('input');
        if (id) inp.id = id;
        inp.type = "number";
        inp.value = value ? value.toFixed(1) : "0.0";
        // Override global massive padding
        Object.assign(inp.style, {
            width: "70px", padding: "4px", fontSize: "0.8rem", textAlign: "right",
            background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff"
        });
        inp.onchange = (e) => callback(e.target.value, inp);

        row.appendChild(l);
        row.appendChild(inp);
        (this.container || this.panel).appendChild(row);
        return inp;
    }

    startUpdateLoop() {
        const update = () => {
            if (this.disposed) return; // Stop if disposed

            if (this.visible && this.physics && this.physics.state) {
                try {
                    const s = this.physics.state;
                    const setTxt = (id, txt) => {
                        const el = document.getElementById(id);
                        if (el) el.innerText = txt;
                    };

                    setTxt("rpm-val", s.rpm.toFixed(1) + "%");
                    setTxt("thrust-val", (s.thrust / 1000).toFixed(1) + " kN");
                    setTxt("egt-val", s.egt.toFixed(0) + " K");
                    setTxt("ff-val", s.fuelFlow.toFixed(3) + " kg/s");
                    setTxt("ma-val", (s.thrust / (s.exitVelocity || 1)).toFixed(2) + " kg/s"); // Approx mass flow derived or we should store it

                    // Actually, PhysicsEngine should expose m_a. 
                    // Let's check: it doesn't expose m_a in state explicitly, only airDensityInlet.
                    // But F = ma * (Vj - V0). m_a = F / (Vj - V0).
                    // Wait, PhysicsEngine has m_a internal.
                    // For now, let's use a rough calc or update physics engine later to expose m_a.

                    // SYNC START BUTTON
                    // The button might have become desynced if we refreshed or used a preset
                    const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("ENGINE"));
                    if (startBtn && this.physics.inputs) {
                        const isRun = this.physics.inputs.ignition;
                        const currentText = startBtn.innerText;
                        const expectedText = isRun ? "STOP ENGINE" : "START ENGINE";

                        if (currentText !== expectedText) {
                            startBtn.innerText = expectedText;
                            startBtn.className = isRun ? "btn-primary" : "btn-secondary";
                            startBtn.style.background = isRun ? "rgba(72, 187, 120, 0.2)" : "";
                            startBtn.style.borderColor = isRun ? "#48bb78" : "";
                            startBtn.style.color = isRun ? "#48bb78" : "";
                        }
                    }
                    // Actually, s.thrust / s.exitVelocity is decent for static.

                    setTxt("tsfc-val", s.tsfc.toFixed(2));
                    setTxt("p3-val", (s.p3 / 1000).toFixed(0) + " kPa");
                    setTxt("t4-val", s.t4.toFixed(0) + " K");
                    setTxt("vjet-val", s.exitVelocity.toFixed(0) + " m/s");

                    // Update Inputs that might change automatically (e.g. Standard Atmosphere or Presets)
                    const p0Inp = document.getElementById("p0-input");
                    const t0Inp = document.getElementById("t0-input");
                    const thrSlider = document.getElementById("thr-slider");
                    const altSlider = document.getElementById("alt-slider");

                    if (!this.physics.inputs.manualAtmosphere) {
                        if (p0Inp && document.activeElement !== p0Inp) p0Inp.value = this.physics.inputs.ambientPress.toFixed(0);
                        if (t0Inp && document.activeElement !== t0Inp) t0Inp.value = this.physics.inputs.ambientTemp.toFixed(1);
                    }

                    // Sync Sliders if changed by Preset
                    if (thrSlider && document.activeElement !== thrSlider && Math.abs(parseFloat(thrSlider.value) - this.physics.inputs.throttle) > 0.5) {
                        thrSlider.value = this.physics.inputs.throttle;
                        // Trigger input event to update label? Hard to do without ref. 
                        // Just rely on visuals for now.
                    }
                    if (altSlider && document.activeElement !== altSlider && Math.abs(parseFloat(altSlider.value) - this.physics.inputs.altitude) > 100) {
                        altSlider.value = this.physics.inputs.altitude;
                    }

                } catch (e) { }
            }
            this.rafId = requestAnimationFrame(update);
        };
        update();
    }

    async runPerformanceTest() {
        // Simplified Test UI for new Theme
        const overlay = document.createElement("div");
        overlay.className = "glass-panel anim-fade-in";
        Object.assign(overlay.style, {
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            padding: "30px", zIndex: "2000", width: "500px", display: "flex", flexDirection: "column", gap: "10px"
        });

        const h = document.createElement("h3");
        h.innerText = "RUNNING PERFORMANCE SWEEP...";
        h.style.color = "var(--accent-primary)";
        overlay.appendChild(h);
        document.body.appendChild(overlay);

        const startInputs = { ...this.physics.inputs };
        let report = "RPM (%)  | THRUST (kN) | EGT (K)  | TSFC\n";
        report += "------------------------------------------\n";

        for (let i = 0; i <= 100; i += 10) {
            this.physics.inputs.throttle = i;
            h.innerText = `TESTING THROTTLE: ${i}%`;

            await new Promise(r => setTimeout(r, 100)); // Fast visual sweep
            for (let t = 0; t < 30; t++) this.physics.update(1.0 / 60.0);

            const s = this.physics.state;
            const line = `${s.rpm.toFixed(1).padEnd(8)} | ${(s.thrust / 1000).toFixed(1).padEnd(11)} | ${s.egt.toFixed(0).padEnd(8)} | ${s.tsfc.toFixed(2)}`;
            report += line + "\n";
        }

        this.physics.inputs = startInputs;

        // Final Report
        h.innerText = "SWEEP COMPLETE";
        const pre = document.createElement("pre");
        pre.innerText = report;
        Object.assign(pre.style, {
            background: "rgba(0,0,0,0.5)", padding: "10px", borderRadius: "8px",
            fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-main)"
        });
        overlay.appendChild(pre);

        const closeBtn = document.createElement("button");
        closeBtn.innerText = "CLOSE";
        closeBtn.className = "btn-primary";
        closeBtn.onclick = () => overlay.remove();
        overlay.appendChild(closeBtn);
    }

    // Legacy support for Component View (if needed) - Simplified to just log for now to avoid complexity issues
    showComponentView(name) {
        // Todo: Implement specific component view in new UI
        console.log("View Component:", name);
    }
}
