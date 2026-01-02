export class MissionView {
    constructor(missionData, onClose) {
        this.mission = missionData;
        this.onClose = onClose;

        this.container = document.createElement("div");
        Object.assign(this.container.style, {
            position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
            background: "#000", color: "#ddd", zIndex: "3000",
            display: "flex", fontFamily: "monospace"
        });

        this.buildSidebar();
        this.buildMainPanel();

        document.body.appendChild(this.container);
    }

    buildSidebar() {
        const sidebar = document.createElement("div");
        Object.assign(sidebar.style, {
            width: "300px", borderRight: "1px solid #333", padding: "2rem",
            background: "#111", display: "flex", flexDirection: "column"
        });

        const title = document.createElement("h3");
        title.innerText = "MISSION LOG";
        Object.assign(title.style, { color: "#4299e1", marginBottom: "2rem", letterSpacing: "2px" });

        const missionTitle = document.createElement("div");
        missionTitle.innerText = this.mission.title;
        Object.assign(missionTitle.style, { fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" });

        const closeBtn = document.createElement("button");
        closeBtn.innerText = "ABORT MISSION";
        Object.assign(closeBtn.style, {
            marginTop: "auto", background: "#E53E3E", border: "none", color: "white", padding: "1rem", cursor: "pointer"
        });
        closeBtn.onclick = () => {
            this.container.remove();
            this.onClose();
        };

        sidebar.appendChild(title);
        sidebar.appendChild(missionTitle);
        sidebar.appendChild(closeBtn);
        this.container.appendChild(sidebar);
    }

    buildMainPanel() {
        this.panel = document.createElement("div");
        Object.assign(this.panel.style, { flex: "1", padding: "3rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2rem" });
        this.container.appendChild(this.panel);

        this.addMessage("SYSTEM", "INCOMING TRANSMISSION FROM CHIEF ENGINEER...");
        setTimeout(() => {
            this.addMessage("SENIOR ENGINEER", this.mission.scenario);
            this.startDialogue();
        }, 800);
    }

    startDialogue() {
        // Support Legacy (Single Step) or New (Nodes)
        if (this.mission.nodes) {
            this.renderNode("start");
        } else {
            // Legacy Fallback
            setTimeout(() => {
                this.addMessage("SENIOR ENGINEER", this.mission.initialPrompt);
                this.showChoices(this.mission.choices); // Legacy array
            }, 1000);
        }
    }

    renderNode(nodeId) {
        if (!nodeId) return; // End of flow
        const node = this.mission.nodes[nodeId];
        if (!node) { console.error("Missing node:", nodeId); return; }

        setTimeout(() => {
            this.addMessage(node.sender || "SENIOR ENGINEER", node.text);

            if (node.choices) {
                // Interactive Node
                this.showChoices(node.choices);
            } else if (node.next) {
                // Info Node (Auto-advance)
                this.renderNode(node.next);
            } else {
                // End Node (Mastery Complete)
                setTimeout(() => this.addMessage("SYSTEM", "MISSION COMPLETE. MASTERY LOGGED."), 1000);
            }
        }, 800);
    }

    addMessage(sender, text) {
        const msg = document.createElement("div");
        Object.assign(msg.style, {
            padding: "1.5rem", background: sender === "SYSTEM" ? "transparent" : "#1a202c",
            borderLeft: sender === "SYSTEM" ? "none" : "4px solid #4299e1",
            marginBottom: "1rem", animation: "fadeIn 0.3s ease"
        });

        const header = document.createElement("div");
        header.innerText = sender;
        Object.assign(header.style, { fontSize: "0.8rem", color: "#718096", marginBottom: "0.5rem", fontWeight: "bold" });

        const body = document.createElement("div");
        body.innerHTML = text.replace(/\n/g, "<br>"); // Support line breaks
        Object.assign(body.style, { lineHeight: "1.6", fontSize: "1.1rem" });

        msg.appendChild(header);
        msg.appendChild(body);
        this.panel.appendChild(msg);
        this.panel.scrollTop = this.panel.scrollHeight;
    }

    showChoices(choices) {
        const choicesDiv = document.createElement("div");
        Object.assign(choicesDiv.style, { display: "grid", gap: "1rem", marginTop: "1rem" });

        choices.forEach(choice => {
            const btn = document.createElement("button");
            btn.innerText = choice.label;
            Object.assign(btn.style, {
                padding: "1.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid #444",
                color: "white", textAlign: "left", cursor: "pointer", fontSize: "1rem",
                fontFamily: "monospace"
            });
            btn.onmouseover = () => btn.style.borderColor = "#4299e1";
            btn.onmouseout = () => btn.style.borderColor = "#444";

            btn.onclick = () => {
                // Disable all
                Array.from(choicesDiv.children).forEach(c => c.disabled = true);

                // Show User Choice
                this.addMessage("YOU", choice.label);

                // Show Feedback & Next
                setTimeout(() => {
                    this.addMessage("SENIOR ENGINEER", choice.feedback);
                    if (choice.next && (choice.feedback.includes("Correct") || !choice.feedback.includes("Incorrect"))) {
                        // Proceed if correct or if it's a branching path
                        this.renderNode(choice.next);
                    } else if (choice.feedback.includes("Incorrect")) {
                        // Soft Retry (Unlock buttons? Or just end? User said "If they haven't learned"...)
                        // For now we stop. User must "Abort" to retry.
                        // Ideally we'd allow re-selection, but let's encourage "Thinking first".
                        setTimeout(() => this.addMessage("SYSTEM", "CRITICAL REASONING FAILURE. RESTART MISSION."), 1000);
                    }
                }, 800);
            };

            choicesDiv.appendChild(btn);
        });

        this.panel.appendChild(choicesDiv);
        this.panel.scrollTop = this.panel.scrollHeight;
    }
}
