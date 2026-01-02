import { PhysicsAnimations } from "./animations/PhysicsAnimations.js";

export class ModuleView {
    constructor(moduleData, onClose) {
        this.module = moduleData;
        this.onClose = onClose;

        this.container = document.createElement("div");
        Object.assign(this.container.style, {
            position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
            background: "#000", color: "#ddd", zIndex: "3000",
            display: "flex", fontFamily: "'Inter', sans-serif"
        });

        this.buildVisualStage();
        this.buildContentPanel();

        document.body.appendChild(this.container);

        // Start Interaction
        this.renderNode("start");
    }

    buildVisualStage() {
        const stage = document.createElement("div");
        Object.assign(stage.style, {
            flex: "1.5", background: "#1a202c", position: "relative", overflow: "hidden",
            borderRight: "1px solid #333"
        });

        // Title Overlay
        const title = document.createElement("div");
        title.innerText = this.module.title.toUpperCase();
        Object.assign(title.style, {
            position: "absolute", top: "2rem", left: "2rem",
            color: "rgba(255,255,255,0.1)", fontSize: "3rem", fontWeight: "900", pointerEvents: "none"
        });
        stage.appendChild(title);

        this.container.appendChild(stage);

        // Initialize Animator
        this.animator = new PhysicsAnimations(stage);
    }

    buildContentPanel() {
        // Outer Panel (Layout only)
        this.panel = document.createElement("div");
        Object.assign(this.panel.style, {
            flex: "1", background: "#fff", color: "#2d3748",
            position: "relative", display: "flex", flexDirection: "column",
            overflow: "hidden"
        });

        // Close Button (Fixed Header)
        const closeHeader = document.createElement("div");
        Object.assign(closeHeader.style, {
            width: "100%", padding: "1rem", display: "flex", justifyContent: "flex-end",
            background: "linear-gradient(to bottom, #fff 80%, transparent)"
        });

        const btnClose = document.createElement("button");
        btnClose.innerHTML = "&times;";
        Object.assign(btnClose.style, {
            background: "none", border: "none", fontSize: "2.5rem",
            cursor: "pointer", color: "#2d3748", lineHeight: "1"
        });
        btnClose.onclick = () => {
            this.container.remove();
            if (this.onClose) this.onClose(false);
        };
        closeHeader.appendChild(btnClose);
        this.panel.appendChild(closeHeader);

        // Scroll Container
        const scrollContainer = document.createElement("div");
        Object.assign(scrollContainer.style, {
            flex: "1", overflowY: "auto", padding: "0 4rem 6rem 4rem",
            scrollBehavior: "smooth"
        });

        // Content Area
        this.contentArea = document.createElement("div");
        Object.assign(this.contentArea.style, {
            display: "flex", flexDirection: "column", gap: "2rem",
            fontSize: "1.1rem", lineHeight: "1.6"
        });

        scrollContainer.appendChild(this.contentArea);
        this.panel.appendChild(scrollContainer);

        this.container.appendChild(this.panel);
    }

    renderNode(nodeId) {
        if (!nodeId) return;

        const node = this.module.nodes[nodeId];
        if (!node) return;

        // Update Visuals
        // Update Visuals
        if (node.visual) {
            const parts = node.visual.split("-");
            const scene = parts[0];
            const state = parts.slice(1).join("-");
            this.animator.loadScene(scene, state);
        }

        // Render Text (Simple Markdown Parser)
        this.contentArea.innerHTML = "";

        const textBlock = document.createElement("div");

        // Parse Markdown logic
        let html = node.text;

        // Headers (## Title) - Blue header
        html = html.replace(/^## (.*$)/gim, '<h2 style="color:#2b6cb0; margin-bottom:1rem; fontSize:1.5rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;">$1</h2>');

        // Bold (**Text**) - Darker bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#2d3748; font-weight:900;">$1</strong>');

        // Lists (- Item)
        html = html.replace(/^\- (.*$)/gim, '<li style="margin-left:1.5rem; margin-bottom:0.5rem; color:#4a5568;">$1</li>');

        // Paragraphs (Double newline)
        html = html.replace(/\n\n/g, '<br><br>');

        // Remaining Single newlines
        html = html.replace(/\n/g, '<br>'); // Better line breaks

        textBlock.innerHTML = html;
        textBlock.style.animation = "fadeIn 0.5s ease";
        this.contentArea.appendChild(textBlock);

        // --- INTERACTIVE CONTROLS (LAB MODE) ---
        if (node.controls) {
            const controlsDiv = document.createElement("div");
            Object.assign(controlsDiv.style, {
                background: "#f7fafc", padding: "1.5rem", borderRadius: "8px",
                border: "1px solid #cbd5e0", marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem"
            });

            const title = document.createElement("div");
            title.innerHTML = "<strong>🔬 EXPERIMENT LAB</strong>";
            Object.assign(title.style, { fontSize: "0.9rem", color: "#718096", letterSpacing: "1px" });
            controlsDiv.appendChild(title);

            node.controls.forEach(ctrl => {
                const row = document.createElement("div");
                Object.assign(row.style, { display: "flex", alignItems: "center", justifyContent: "space-between" });

                if (ctrl.type === "button") {
                    const btn = document.createElement("button");
                    btn.innerText = ctrl.label;
                    Object.assign(btn.style, {
                        flex: "1", padding: "8px", background: "#4299e1", color: "white",
                        border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold"
                    });

                    btn.onclick = () => {
                        // Special Handling for Builder
                        if (ctrl.action === "add") {
                            if (!this.assembly) this.assembly = [];
                            this.assembly.push(ctrl.value);
                            this.animator.update("assembly", this.assembly);
                        } else if (ctrl.action === "reset") {
                            this.assembly = [];
                            this.params = { isRunning: false }; // Reset run state
                            this.animator.update("isRunning", false);
                            this.animator.update("assembly", []);
                        } else if (ctrl.action === "run") {
                            this.animator.update("isRunning", true);
                        }
                    };

                    row.appendChild(btn);
                } else {
                    // SLIDER Logic
                    const label = document.createElement("label");
                    label.innerText = ctrl.label;
                    Object.assign(label.style, { fontWeight: "bold", fontSize: "0.9rem", width: "100px" });

                    const input = document.createElement("input");
                    input.type = "range";
                    input.min = ctrl.min;
                    input.max = ctrl.max;
                    input.value = ctrl.default || (ctrl.min + ctrl.max) / 2;
                    Object.assign(input.style, { flex: "1", margin: "0 10px", cursor: "pointer" });

                    const valDisplay = document.createElement("span");
                    valDisplay.innerText = input.value;
                    Object.assign(valDisplay.style, { width: "40px", textAlign: "right", fontFamily: "monospace" });

                    input.oninput = (e) => {
                        valDisplay.innerText = e.target.value;
                        this.animator.update(ctrl.id, parseFloat(e.target.value));

                        // Specific Logic for completion? 
                        // For now, just let them play. Completion is handled by the "Next" button usually.
                    };

                    // Trigger initial value
                    setTimeout(() => this.animator.update(ctrl.id, parseFloat(input.value)), 100);

                    row.appendChild(label);
                    row.appendChild(input);
                    row.appendChild(valDisplay);
                }

                controlsDiv.appendChild(row);
            });

            this.contentArea.appendChild(controlsDiv);
        }

        // Render Choices or Continue
        if (node.choices) {
            const choicesDiv = document.createElement("div");
            Object.assign(choicesDiv.style, { display: "flex", flexDirection: "column", gap: "1rem", marginTop: "2rem" });

            node.choices.forEach(choice => {
                const btn = document.createElement("button");
                btn.innerText = choice.label;
                Object.assign(btn.style, {
                    padding: "1rem 1.5rem", background: "#edf2f7", border: "1px solid #cbd5e0",
                    borderRadius: "8px", cursor: "pointer", textAlign: "left", fontSize: "1rem",
                    transition: "all 0.2s"
                });

                btn.onmouseover = () => btn.style.background = "#e2e8f0";
                btn.onmouseout = () => btn.style.background = "#edf2f7";

                btn.onclick = () => {
                    // Lock UI
                    Array.from(choicesDiv.children).forEach(b => {
                        b.disabled = true;
                        b.style.opacity = "0.5";
                        b.style.cursor = "default";
                    });
                    Object.assign(btn.style, { opacity: "1", border: "2px solid #fff" });

                    // Logic
                    const isCorrect = choice.isCorrect;

                    // Feedback
                    const feedbackDiv = document.createElement("div");
                    feedbackDiv.innerHTML = `<br><strong>${isCorrect ? "ANALYSIS (CORRECT)" : "MISCONCEPTION"}</strong><br>${choice.feedback}`;
                    Object.assign(feedbackDiv.style, {
                        marginTop: "1.5rem", padding: "1rem", borderRadius: "8px",
                        background: isCorrect ? "rgba(72, 187, 120, 0.1)" : "rgba(229, 62, 62, 0.1)",
                        borderLeft: `4px solid ${isCorrect ? "#48bb78" : "#e53e3e"}`,
                        color: isCorrect ? "#2f855a" : "#c53030",
                        animation: "fadeIn 0.3s ease"
                    });
                    this.contentArea.appendChild(feedbackDiv);

                    feedbackDiv.scrollIntoView({ behavior: "smooth", block: "center" });

                    // Action
                    if (isCorrect) {
                        if (choice.next) {
                            const btnNext = document.createElement("button");
                            btnNext.innerText = "Continue →";
                            Object.assign(btnNext.style, {
                                marginTop: "1rem", padding: "0.8rem 1.5rem", background: "#4299e1", color: "white",
                                border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold"
                            });
                            btnNext.onclick = () => this.renderNode(choice.next);
                            this.contentArea.appendChild(btnNext);
                            setTimeout(() => btnNext.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
                        } else {
                            const btnEnd = document.createElement("button");
                            btnEnd.innerText = "Complete Module & Proceed";
                            Object.assign(btnEnd.style, {
                                marginTop: "1rem", padding: "0.8rem 1.5rem", background: "#48bb78", color: "white",
                                border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold",
                                boxShadow: "0 4px 6px rgba(72, 187, 120, 0.3)"
                            });
                            btnEnd.onclick = () => {
                                this.container.remove();
                                if (this.onClose) this.onClose(true);
                            };
                            this.contentArea.appendChild(btnEnd);
                            setTimeout(() => btnEnd.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
                        }
                    } else {
                        const btnRetry = document.createElement("button");
                        btnRetry.innerText = "Re-analyze & Retry ↺";
                        Object.assign(btnRetry.style, {
                            marginTop: "1rem", padding: "0.8rem 1.5rem", background: "white", color: "#e53e3e",
                            border: "1px solid #e53e3e", borderRadius: "4px", cursor: "pointer", fontWeight: "bold"
                        });
                        btnRetry.onclick = () => {
                            feedbackDiv.remove();
                            btnRetry.remove();
                            Array.from(choicesDiv.children).forEach(b => {
                                b.disabled = false;
                                b.style.opacity = "1";
                                b.style.cursor = "pointer";
                                b.style.border = "1px solid #cbd5e0";
                            });
                        };
                        this.contentArea.appendChild(btnRetry);
                        setTimeout(() => btnRetry.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
                    }
                };

                choicesDiv.appendChild(btn);
            });
            this.contentArea.appendChild(choicesDiv);
        } else if (node.next) {
            // LECTURE MODE: No choices, just a "Continue" button
            const btnContinue = document.createElement("button");
            btnContinue.innerText = "Continue Learning →";
            Object.assign(btnContinue.style, {
                marginTop: "2rem", padding: "1rem 2rem", background: "#3182ce", color: "white",
                border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
                alignSelf: "flex-start", fontSize: "1rem", boxShadow: "0 4px 6px rgba(49, 130, 206, 0.3)"
            });
            btnContinue.onmouseover = () => btnContinue.style.background = "#2b6cb0";
            btnContinue.onmouseout = () => btnContinue.style.background = "#3182ce";

            btnContinue.onclick = () => {
                this.renderNode(node.next);
                this.panel.children[1].scrollTop = 0;
            };
            this.contentArea.appendChild(btnContinue);
        } else {
            // END OF MODULE (Lecture only)
            const btnEnd = document.createElement("button");
            btnEnd.innerText = "Complete Module";
            Object.assign(btnEnd.style, {
                marginTop: "2rem", padding: "1rem 2rem", background: "#48bb78", color: "white",
                border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
                alignSelf: "flex-start", fontSize: "1rem"
            });
            btnEnd.onclick = () => {
                this.container.remove();
                if (this.onClose) this.onClose(true);
            };
            this.contentArea.appendChild(btnEnd);
        }
    }
}
