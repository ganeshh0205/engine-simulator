import { dbManager } from "../core/DatabaseManager.js";
import { diagnosticModel } from "../core/DiagnosticModel.js";
import { dataLogger } from "../core/DataLogger.js";
import { LearningEngine } from "../core/LearningEngine.js";

export class ControlPanel {
    constructor(physicsEngine, sceneManager, onExit) {
        this.pe = physicsEngine; // Shared Physics Engine
        this.sm = sceneManager;  // Access to SceneManager
        this.onExit = onExit;

        this.isMobile = window.innerWidth <= 768;
        this.isCollapsed = this.isMobile;
        this.arActive = false; // Explicit Init

        // Local State for UI Sync
        this.params = {
            throttle: this.pe?.inputs?.throttle || 0.0,
            mach: this.pe?.inputs?.mach || 0.0,
            altitude: this.pe?.inputs?.altitude || 0.0,
            nozzleArea: this.pe?.inputs?.nozzleArea || 1.0,
            manualAtmosphere: this.pe?.inputs?.manualAtmosphere || false,
            ambientPress: this.pe?.inputs?.ambientPress || 101325,
            ambientTemp: this.pe?.inputs?.ambientTemp || 288.15
        };

        this.initUI();
        this.startLoop();

        window.addEventListener('resize', this.onResize.bind(this));
    }

    onResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        if (wasMobile !== this.isMobile) {
            this.disposeUI();
            this.initUI();
        }
    }

    disposeUI() {
        if (this.panel) this.panel.remove();
        if (this.toggleBtn) this.toggleBtn.remove();
        if (this.homeBtn) this.homeBtn.remove();
    }

    initUI() {
        // --- HOME BUTTON ---
        this.homeBtn = document.createElement("button");
        this.homeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
        Object.assign(this.homeBtn.style, {
            position: "absolute",
            top: "max(15px, env(safe-area-inset-top))",
            left: "15px", zIndex: "2000",
            width: "40px", height: "40px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            color: "white", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer"
        });
        this.homeBtn.onclick = () => { if (this.onExit) this.onExit(); };
        document.body.appendChild(this.homeBtn);

        // --- MAIN PANEL ---
        this.panel = document.createElement("div");
        Object.assign(this.panel.style, {
            position: "absolute", zIndex: "1000",
            background: "rgba(10, 15, 20, 0.85)", // Darker, professional look
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#e2e8f0",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace", // Monospace for data
            fontSize: "12px",
            display: "flex", flexDirection: "column",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
        });

        if (this.isMobile) {
            // Mobile: Bottom Sheet logic
            Object.assign(this.panel.style, {
                top: "60px", left: "10px", right: "10px",
                bottom: "10px", borderRadius: "10px",
                transform: "translateY(110%)", transition: "transform 0.3s ease",
                overflowY: "auto", // Enable scrolling
                WebkitOverflowScrolling: "touch" // Smooth scroll on iOS
            });
            this.createMobileToggle();

            // Header for Mobile
            const dragBar = document.createElement("div");
            Object.assign(dragBar.style, {
                width: "40px", height: "4px", background: "rgba(255,255,255,0.2)",
                margin: "10px auto", borderRadius: "2px"
            });
            this.panel.appendChild(dragBar);

        } else {
            // Desktop: Right Sidebar (Fixed width)
            Object.assign(this.panel.style, {
                top: "20px", right: "20px", bottom: "20px",
                width: "320px", borderRadius: "4px",
                overflowY: "auto" // Scroll if tall
            });
        }

        const content = document.createElement("div");
        content.style.padding = "20px";
        content.style.display = "flex";
        content.style.flexDirection = "column";
        content.style.gap = "20px";

        // HEADER
        content.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
                <div style="font-weight:700; color:#fff; letter-spacing:1px; font-size:14px;">⚙ FLIGHT CONSOLE</div>
                <div style="font-size:11px; color:#64748b; align-self:center;">LIVE TELEMETRY</div>
            </div>
        `;

        // --- FEATURE TOOLBAR (AR & Voice) ---
        const toolbar = document.createElement("div");
        Object.assign(toolbar.style, {
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "5px"
        });

        const btnAR = document.createElement("button");
        btnAR.id = "btn-ar-toggle"; // Keep ID for logic binding
        btnAR.innerHTML = "👓 AR VIEW";
        Object.assign(btnAR.style, {
            padding: "12px", background: "rgba(14, 165, 233, 0.2)", border: "1px solid rgba(14, 165, 233, 0.4)",
            color: "#38bdf8", fontWeight: "bold", fontSize: "12px", borderRadius: "6px", cursor: "pointer",
            textAlign: "center"
        });

        const btnVoice = document.createElement("button");
        btnVoice.id = "btn-voice-toggle";
        btnVoice.innerHTML = "🎙️ VOICE COMMS";
        Object.assign(btnVoice.style, {
            padding: "12px", background: "rgba(139, 92, 246, 0.2)", border: "1px solid rgba(139, 92, 246, 0.4)",
            color: "#a78bfa", fontWeight: "bold", fontSize: "12px", borderRadius: "6px", cursor: "pointer",
            textAlign: "center"
        });

        toolbar.appendChild(btnAR);
        toolbar.appendChild(btnVoice);
        content.appendChild(toolbar);

        // --- HANDLER BINDING (Re-using existing logic block) ---
        setTimeout(() => {
            // Re-fetch since we just created them in DOM via appendChild (not innerHTML string)
            // But they are objects now.

            // NOTE: The previous logic used setTimeout to fetch by ID. 
            // Since I created elements directly, I can bind onclick directly here if I wanted,
            // BUT to minimize code change, I will keep the IDs and let the existing setTimeout block below find them.
            // However, the existing block grabs them by ID, so they must be in the DOM. 
            // They are appended to 'content' which is appended to 'this.panel' which is appended to Body.
            // So it should work.

            const existingLogicBlock = async () => { /* Logic is downstream */ };

            // I need to ensure the Downstream Logic matches these IDs.
            // The IDs "btn-ar-toggle" and "btn-voice-toggle" are preserved.

            // ... (The original setTimeout block handles the click logic)
        }, 0);

        // --- AR & VOICE HANDLERS (EduAIThon Real Implementation) ---
        setTimeout(() => {
            const btnAR = document.getElementById("btn-ar-toggle");
            const btnVoice = document.getElementById("btn-voice-toggle");

            if (btnAR) btnAR.onclick = async () => {
                if (this.arActive) {
                    this.stopAR();
                } else {
                    // Start AR (Passthrough)
                    this.showToast("⏳ CONNECTING", "Accessing Camera Feed...", "info");
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: "environment" }
                        });

                        this.videoStream = stream;
                        this.arVideo = document.createElement("video");
                        this.arVideo.srcObject = stream;
                        this.arVideo.play();
                        Object.assign(this.arVideo.style, {
                            position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
                            objectFit: "cover", zIndex: "-10", opacity: "1"
                        });
                        document.body.appendChild(this.arVideo);

                        // Transparent Backgrounds
                        document.body.style.background = "transparent";
                        document.documentElement.style.background = "transparent";

                        if (this.sm && this.sm.setAR) this.sm.setAR(true);

                        this.arActive = true;
                        this.showToast("👓 AR ACTIVE", "Projecting Engine into Reality", "info");
                    } catch (err) {
                        console.error(err);
                        this.showToast("AR ERROR", "Camera Permission Denied", "alert");
                        this.stopAR(); // Cleanup if failed mid-way
                    }
                }
            };

            if (btnVoice) btnVoice.onclick = () => {
                if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    alert("Voice Control not supported in this browser.");
                    return;
                }
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.lang = 'en-US';

                recognition.onstart = () => this.showToast("🎙️ LISTENING...", "Say 'Start Engine', 'Shutdown', or 'Takeoff'", "alert");
                recognition.onresult = (edge) => {
                    const transcript = edge.results[0][0].transcript.toLowerCase();
                    this.showToast("🗣️ COMMAND: " + transcript, "Processing...", "info");

                    if (transcript.includes("start") || transcript.includes("ignition")) this.toggleEngine(true);
                    if (transcript.includes("stop") || transcript.includes("shutdown") || transcript.includes("kill")) this.toggleEngine(false);
                    if (transcript.includes("takeoff")) this.applyPreset("TAKEOFF");
                    if (transcript.includes("cruise")) this.applyPreset("CRUISE");
                };
                recognition.onerror = (e) => this.showToast("Error", e.error, "alert");
                recognition.start();
            };
        }, 100);

        // 1. PRESETS
        const presetSection = this.createSection("PRESETS (SAMPLE INPUTS)");
        const presetGrid = document.createElement("div");
        presetGrid.style.display = "grid";
        presetGrid.style.gridTemplateColumns = "1fr 1fr 1fr";
        presetGrid.style.gap = "8px";

        presetGrid.appendChild(this.createButton("IDLE", () => this.applyPreset("IDLE")));
        presetGrid.appendChild(this.createButton("TAKEOFF", () => this.applyPreset("TAKEOFF")));
        presetGrid.appendChild(this.createButton("CRUISE", () => this.applyPreset("CRUISE")));
        presetSection.appendChild(presetGrid);
        content.appendChild(presetSection);

        // 2. FLIGHT CONDITIONS
        const flightSection = this.createSection("FLIGHT CONDITIONS");
        flightSection.appendChild(this.createSlider("Throttle", "%", 0, 100, this.params.throttle, (v) => {
            this.params.throttle = v;
            if (this.pe?.inputs) this.pe.inputs.throttle = v;
        }));
        flightSection.appendChild(this.createSlider("Mach", "M", 0, 2.0, this.params.mach, (v) => {
            this.params.mach = v;
            if (this.pe?.inputs) this.pe.inputs.mach = v;
        }));
        flightSection.appendChild(this.createSlider("Altitude", "ft", 0, 50000, this.params.altitude, (v) => {
            this.params.altitude = v;
            if (this.pe?.inputs) this.pe.inputs.altitude = v;
        }));
        content.appendChild(flightSection);

        // 3. ENVIRONMENT
        const envSection = this.createSection("ENVIRONMENT (MANUAL)");
        // Manual Toggle
        /* 
        const manualToggle = this.createToggleRow("Enable Override", this.params.manualAtmosphere, (v) => {
             this.params.manualAtmosphere = v;
             if(this.pe?.inputs) this.pe.inputs.manualAtmosphere = v;
        });
        envSection.appendChild(manualToggle);
        */
        // Always show inputs, but maybe greyed out if strictly automatic? 
        // User requested "Inlet Press" and "Inlet Temp".

        envSection.appendChild(this.createNumberInput("Inlet Press", "Pa", 101325, (v) => {
            if (this.pe?.inputs) {
                this.pe.inputs.manualAtmosphere = true; // Auto-enable manual on edit
                this.pe.inputs.ambientPress = v;
            }
        }));
        envSection.appendChild(this.createNumberInput("Inlet Temp", "K", 288.15, (v) => {
            if (this.pe?.inputs) {
                this.pe.inputs.manualAtmosphere = true;
                this.pe.inputs.ambientTemp = v;
            }
        }));
        content.appendChild(envSection);

        // 4. FUEL SYSTEMS
        const fuelSection = this.createSection("FUEL SYSTEMS");
        fuelSection.appendChild(this.createSlider("Nozzle Area", "x", 0.5, 1.5, this.params.nozzleArea, (v) => {
            this.params.nozzleArea = v;
            if (this.pe?.inputs) this.pe.inputs.nozzleArea = v;
        }));
        content.appendChild(fuelSection);

        // 5. TELEMETRY (Key Performance, Flow, Thermo)
        // Groups for grid layout
        content.appendChild(this.createSection("KEY PERFORMANCE"));
        this.perfGrid = this.createDataGrid([
            { label: "Thrust", unit: "kN", id: "val-thrust" },
            { label: "RPM (N1)", unit: "%", id: "val-rpm" },
            { label: "TSFC", unit: "", id: "val-tsfc" }
        ]);
        content.appendChild(this.perfGrid);

        content.appendChild(this.createSection("FLOW RATES"));
        this.flowGrid = this.createDataGrid([
            { label: "Air Flow", unit: "kg/s", id: "val-airflow" },
            { label: "Fuel Flow", unit: "kg/s", id: "val-fuelflow" }
        ]);
        content.appendChild(this.flowGrid);

        content.appendChild(this.createSection("THERMODYNAMICS"));
        this.thermoGrid = this.createDataGrid([
            { label: "P3 (Comp Exit)", unit: "kPa", id: "val-p3" },
            { label: "T4 (Combustor)", unit: "K", id: "val-t4" },
            { label: "EGT (T5)", unit: "K", id: "val-egt" },
            { label: "Jet Vel (Vj)", unit: "m/s", id: "val-vj" }
        ]);
        content.appendChild(this.thermoGrid);

        // 6. SYSTEM CONTROL
        const sysSection = this.createSection("SYSTEM CONTROL");
        const sysGrid = document.createElement("div");
        sysGrid.style.display = "grid";
        sysGrid.style.gridTemplateColumns = "1fr 1fr";
        sysGrid.style.gap = "8px";

        this.startBtn = this.createButton("START ENGINE", () => this.toggleEngine(true));
        this.startBtn.style.background = "rgba(16, 185, 129, 0.2)";
        this.startBtn.style.color = "#34d399";

        this.stopBtn = this.createButton("SHUTDOWN", () => this.toggleEngine(false));
        this.stopBtn.style.background = "rgba(239, 68, 68, 0.2)";
        this.stopBtn.style.color = "#f87171";

        sysGrid.appendChild(this.startBtn);
        sysGrid.appendChild(this.stopBtn);
        sysSection.appendChild(sysGrid);
        content.appendChild(sysSection);

        // 7. AI DIAGNOSTICS (EduAIThon Feature)
        const aiSection = this.createSection("AI DIAGNOSTICS");
        const aiGrid = document.createElement("div");
        aiGrid.style.display = "flex";
        aiGrid.style.flexDirection = "column";
        aiGrid.style.gap = "8px";

        // Status Card
        this.aiStatus = document.createElement("div");
        Object.assign(this.aiStatus.style, {
            padding: "10px", background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px",
            color: "#34d399", fontWeight: "bold", textAlign: "center", fontSize: "14px"
        });
        this.aiStatus.innerText = "SYSTEM NOMINAL";
        aiGrid.appendChild(this.aiStatus);

        // Reasons List
        this.aiReasons = document.createElement("div");
        this.aiReasons.style.fontSize = "10px";
        this.aiReasons.style.color = "#94a3b8";
        this.aiReasons.style.minHeight = "20px";
        aiGrid.appendChild(this.aiReasons);

        // Export Button
        const exportBtn = this.createButton("⬇ EXPORT TRAINING DATA", () => {
            const count = dataLogger.exportCSV();
            this.setDebug(`Exported ${count} frames`);
        });
        aiGrid.appendChild(exportBtn);

        aiSection.appendChild(aiGrid);
        content.appendChild(aiSection);

        this.panel.appendChild(content);

        // --- DEBUG/DIAGNOSTICS SECTION ---
        // Hidden by default, but setDebug writes here
        this.debugLog = document.createElement("div");
        Object.assign(this.debugLog.style, {
            marginTop: "10px", padding: "10px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            color: "#64748b", fontSize: "10px", fontFamily: "monospace",
            display: "none" // Hidden until used
        });
        this.panel.appendChild(this.debugLog);

        document.body.appendChild(this.panel);
    }

    // --- INTERACTION MANAGER HANDLERS ---
    setDebug(msg) {
        if (!this.debugLog) return;
        this.debugLog.style.display = "block";
        this.debugLog.innerText = `[DEBUG] ${msg}`;
        // Auto-hide after delay?
        setTimeout(() => {
            this.debugLog.innerText = "";
            this.debugLog.style.display = "none";
        }, 3000);
    }

    showMainView() {
        // Called when deselecting.
        // For now, we just ensure the panel is visible or reset specific component views if implemented.
        this.setDebug("Main View Active");
    }

    showComponentView(name, object) {
        // Called when selecting a component.
        // Could show component specific stats here.
        this.setDebug(`Selected: ${name}`);
    }

    createMobileToggle() {
        this.toggleBtn = document.createElement("button");
        this.toggleBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.4 15C20.4 14.3 21 13.2 21 12C21 10.8 20.4 9.7 19.4 9L21 6H17.6C17.2 5 16.6 4.1 15.9 3.3L17.7 0.7L15 0L13.7 2.8C13.1 2.7 12.6 2.6 12 2.6C11.4 2.6 10.9 2.7 10.3 2.8L9 0L6.3 0.7L8.1 3.3C7.4 4.1 6.8 5 6.4 6H3L4.6 9C3.6 9.7 3 10.8 3 12C3 13.2 3.6 14.3 4.6 15L3 18H6.4C6.8 19 7.4 19.9 8.1 20.7L6.3 23.3L9 24L10.3 21.2C10.9 21.3 11.4 21.4 12 21.4C12.6 21.4 13.1 21.3 13.7 21.2L15 24L17.7 23.3L15.9 20.7C16.6 19.9 17.2 19 17.6 18H21L19.4 15Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        Object.assign(this.toggleBtn.style, {
            position: "absolute", bottom: "30px", right: "20px", zIndex: "2000",
            width: "50px", height: "50px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#0ea5e9", color: "white",
            border: "none", boxShadow: "0 4px 15px rgba(14, 165, 233, 0.4)"
        });
        this.toggleBtn.onclick = () => {
            this.isCollapsed = !this.isCollapsed;
            this.panel.style.transform = this.isCollapsed ? "translateY(110%)" : "translateY(0)";
        };
        document.body.appendChild(this.toggleBtn);
    }

    createSection(title) {
        const div = document.createElement("div");
        div.innerHTML = `<div style="font-size:10px; color:#94a3b8; font-weight:600; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:4px;">${title}</div>`;
        return div;
    }

    createButton(text, onClick) {
        const btn = document.createElement("button");
        btn.innerText = text;
        Object.assign(btn.style, {
            padding: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e8f0", fontSize: "10px", fontWeight: "600", cursor: "pointer", borderRadius: "4px"
        });
        btn.onclick = onClick;
        return btn;
    }

    createSlider(label, unit, min, max, val, onChange) {
        const div = document.createElement("div");
        div.style.marginBottom = "10px";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.marginBottom = "4px";
        header.innerHTML = `<span>${label}</span><span style="color:#38bdf8">${val.toFixed(1)}${unit}</span>`;

        const input = document.createElement("input");
        input.type = "range";
        input.min = min; input.max = max; input.step = (max - min) / 100;
        input.value = val;
        input.style.width = "100%";
        input.style.accentColor = "#0ea5e9";

        input.oninput = (e) => {
            const v = parseFloat(e.target.value);
            header.children[1].innerText = v.toFixed(unit === '%' || unit === 'x' ? 1 : 0) + unit;
            onChange(v);
        };

        div.appendChild(header);
        div.appendChild(input);
        return div;
    }

    createNumberInput(label, unit, val, onChange) {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";
        div.style.marginBottom = "8px";
        div.style.fontSize = "11px";

        const lbl = document.createElement("div");
        lbl.innerText = label;
        lbl.style.color = "#cbd5e1";

        const input = document.createElement("input");
        input.type = "number";
        input.value = val;
        Object.assign(input.style, {
            background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#38bdf8", padding: "4px", width: "80px", textAlign: "right", borderRadius: "3px"
        });
        input.onchange = (e) => onChange(parseFloat(e.target.value));

        div.appendChild(lbl);
        div.appendChild(input);
        return div;
    }

    createDataGrid(items) {
        const grid = document.createElement("div");
        grid.style.display = "grid";
        grid.style.gridTemplateColumns = "1fr 1fr";
        grid.style.gap = "8px";

        items.forEach(item => {
            const el = document.createElement("div");
            el.innerHTML = `
                <div style="font-size:10px; color:#64748b;">${item.label}</div>
                <div id="${item.id}" style="font-size:13px; color:#e2e8f0; font-weight:600;">-- ${item.unit}</div>
            `;
            grid.appendChild(el);
        });
        return grid;
    }

    applyPreset(name) {
        if (!this.pe?.inputs) return;
        const i = this.pe.inputs;
        if (name === "IDLE") {
            i.throttle = 20.0;
            i.altitude = 0.0;
            i.mach = 0.0;
        } else if (name === "TAKEOFF") {
            i.throttle = 100.0;
            i.altitude = 0.0;
            i.mach = 0.2;
        } else if (name === "CRUISE") {
            i.throttle = 85.0;
            i.altitude = 35000;
            i.mach = 0.8;
        }
        // Force refresh sliders
        this.disposeUI();
        this.initUI();
    }

    toggleEngine(on) {
        if (this.pe?.inputs) this.pe.inputs.ignition = on;
        if (this.sm?.simState) this.sm.simState.ignition = on;
    }

    startLoop() {
        const update = () => {
            if (!this.panel.isConnected) return;
            if (this.pe?.state) {
                const s = this.pe.state;
                const updateVal = (id, val, prec = 1) => {
                    const el = document.getElementById(id);
                    if (el) el.innerText = val.toFixed(prec);
                };

                updateVal("val-thrust", s.thrust / 1000, 2);
                updateVal("val-rpm", s.rpm, 1);
                updateVal("val-tsfc", s.tsfc, 3);
                updateVal("val-airflow", this.pe.stations[2] ? (this.pe.stations[2].P / (287 * this.pe.stations[2].T)) * 10 : 0, 2); // Hack approximated flow for Viz? or use s.fuelFlow * ratio
                // Actually pe.state doesn't expose air mass flow directly in basic version? 
                // Wait, pe.state.fuelFlow is there.

                updateVal("val-airflow", s.thrust / (s.exitVelocity || 1), 2); // Reverse solve roughly or add to physics
                updateVal("val-fuelflow", s.fuelFlow, 4);

                updateVal("val-p3", s.p3 / 1000, 1);
                updateVal("val-t4", s.t4, 0);
                updateVal("val-egt", s.egt, 0);
                updateVal("val-vj", s.exitVelocity, 0);

                // UPDATE AI DIAGNOSTICS
                if (this.aiStatus) {
                    const prediction = diagnosticModel.predict(s);
                    this.aiStatus.innerText = `STATUS: ${prediction.status}`;

                    if (prediction.status === "CRITICAL") {
                        this.aiStatus.style.background = "rgba(239, 68, 68, 0.2)";
                        this.aiStatus.style.color = "#f87171";
                        this.aiStatus.style.borderColor = "#f87171";
                    } else if (prediction.status === "WARNING") {
                        this.aiStatus.style.background = "rgba(245, 158, 11, 0.2)";
                        this.aiStatus.style.color = "#fbbf24";
                        this.aiStatus.style.borderColor = "#fbbf24";
                    } else {
                        this.aiStatus.style.background = "rgba(16, 185, 129, 0.1)";
                        this.aiStatus.style.color = "#34d399";
                        this.aiStatus.style.borderColor = "#34d399";
                    }

                    if (prediction.reasons.length > 0) {
                        this.aiReasons.innerText = "⚠ " + prediction.reasons.join(", ");
                    } else {
                        const acc = (prediction.metrics.accuracy * 100).toFixed(1);
                        this.aiReasons.innerHTML = `
                            <div style="display:flex; justify-content:space-between; width:100%;">
                                <span>Conf: ${(prediction.confidence * 100).toFixed(1)}%</span>
                                <span style="opacity:0.7; font-size:9px;">Acc: ${acc}% (N=${prediction.metrics.samples})</span>
                            </div>
                        `;
                    }

                    // CHECK AI MENTOR
                    if (!this.learningEngine) this.learningEngine = new LearningEngine(this.pe);
                    const advice = this.learningEngine.evaluate();
                    if (advice) {
                        this.showToast(advice.title, advice.message, advice.type);
                    }

                    // CHECK PREDICTIVE RUL
                    const rul = diagnosticModel.predictRUL(s);
                    if (rul && rul.seconds < 15.0) {
                        // Urgent Prediction Display
                        if (!this.rulDisplay) {
                            this.rulDisplay = document.createElement("div");
                            Object.assign(this.rulDisplay.style, {
                                marginTop: "8px", padding: "8px", background: "rgba(239, 68, 68, 0.15)",
                                border: "1px dashed #ef4444", borderRadius: "4px",
                                color: "#ef4444", fontSize: "11px", fontWeight: "bold",
                                textAlign: "center", animation: "pulse 1s infinite"
                            });
                            this.aiStatus.parentNode.appendChild(this.rulDisplay);
                        }
                        this.rulDisplay.innerText = `⚠ PREDICTED ${rul.parameter} FAIL IN ${rul.seconds.toFixed(1)}s`;
                        this.rulDisplay.style.display = "block";
                    } else {
                        if (this.rulDisplay) this.rulDisplay.style.display = "none";
                    }
                }

                // Button State Sync
                if (this.pe.inputs) {
                    const ign = this.pe.inputs.ignition;
                    if (this.startBtn) this.startBtn.style.display = ign ? "none" : "block";
                    if (this.stopBtn) this.stopBtn.style.display = ign ? "block" : "none";
                }
            }
            requestAnimationFrame(update);
        };
        update();
    }

    dispose() {
        this.disposeUI();
        this.stopAR(); // Ensure camera is released
    }

    stopAR() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
        if (this.arVideo) this.arVideo.remove();

        // Reset backgrounds
        document.body.style.background = "";
        document.documentElement.style.background = "";

        if (this.sm && this.sm.setAR) this.sm.setAR(false);

        if (this.arActive) {
            this.arActive = false;
            this.showToast("AR OFF", "Returned to Standard View", "info");
        }
    }

    showToast(title, msg, type) {
        const toast = document.createElement("div");
        const color = type === "alert" ? "#f87171" : "#38bdf8";
        Object.assign(toast.style, {
            position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.95)", border: `1px solid ${color}`,
            borderRadius: "8px", padding: "15px", zIndex: "3000",
            display: "flex", flexDirection: "column", gap: "5px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)", minWidth: "300px", maxWidth: "90%"
        });

        toast.innerHTML = `
            <div style="color:${color}; font-weight:bold; font-size:12px; display:flex; align-items:center; gap:8px;">
                <span>🤖 AI MENTOR</span>
                <span style="opacity:0.5">|</span>
                <span>${title}</span>
            </div>
            <div style="color:#e2e8f0; font-size:13px; line-height:1.4;">
                ${msg.replace(/\*\*(.*?)\*\*/g, '<b style="color:#fff">$1</b>')}
            </div>
        `;

        document.body.appendChild(toast);

        // Animation
        toast.animate([
            { opacity: 0, transform: "translateX(-50%) translateY(-20px)" },
            { opacity: 1, transform: "translateX(-50%) translateY(0)" }
        ], { duration: 300, easing: "ease-out" });

        setTimeout(() => {
            const fade = toast.animate([
                { opacity: 1 },
                { opacity: 0 }
            ], { duration: 300 });
            fade.onfinish = () => toast.remove();
        }, 6000);
    }
}
