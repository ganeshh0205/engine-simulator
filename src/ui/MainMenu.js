export class MainMenu {
    constructor(onStart) {
        this.onStart = onStart;
        this.container = document.createElement("div");
        Object.assign(this.container.style, {
            position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
            background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)", // Light Theme Gradient
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            zIndex: "1000", fontFamily: "'Inter', sans-serif", color: "#2d3748" // Dark Text
        });

        this.buildUI();
        document.body.appendChild(this.container);
    }

    buildUI() {
        // Title
        const title = document.createElement("h1");
        title.innerText = "AERO-ENGINE SIMULATOR";
        Object.assign(title.style, {
            fontSize: "3rem", fontWeight: "800", letterSpacing: "4px", marginBottom: "1rem",
            textShadow: "0 0 20px rgba(0, 255, 0, 0.4)"
        });
        this.container.appendChild(title);

        const subtitle = document.createElement("p");
        subtitle.innerText = "Interactive Physics & Propulsion Learning Platform";
        Object.assign(subtitle.style, {
            fontSize: "1.2rem", color: "#a0aec0", marginBottom: "4rem"
        });
        this.container.appendChild(subtitle);

        // Buttons Container
        const btnContainer = document.createElement("div");
        Object.assign(btnContainer.style, {
            display: "flex", gap: "2rem"
        });

        // 1. TUTORIAL BUTTON
        const btnTutorial = this.createButton("TUTORIAL MODE", "Guided Tour & Animations", () => {
            this.hide();
            this.onStart("TUTORIAL");
        });

        // 2. SANDBOX BUTTON
        const btnSandbox = this.createButton("SANDBOX MODE", "Free Experimentation", () => {
            this.hide();
            this.onStart("SANDBOX");
        });

        btnContainer.appendChild(btnTutorial);
        btnContainer.appendChild(btnSandbox);
        this.container.appendChild(btnContainer);
    }

    createButton(label, subtext, onClick) {
        const btn = document.createElement("button");
        Object.assign(btn.style, {
            background: "white",
            border: "1px solid #e2e8f0",
            padding: "2rem 3rem",
            borderRadius: "12px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            display: "flex", flexDirection: "column", alignItems: "center",
            minWidth: "250px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
        });

        btn.onmouseover = () => {
            btn.style.transform = "translateY(-5px)";
            btn.style.boxShadow = "0 10px 15px rgba(0, 0, 0, 0.1)";
            btn.style.borderColor = "#3182ce"; // Blue highlight
        };
        btn.onmouseout = () => {
            btn.style.transform = "translateY(0)";
            btn.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
            btn.style.borderColor = "#e2e8f0";
        };
        btn.onclick = onClick;

        const lbl = document.createElement("span");
        lbl.innerText = label;
        Object.assign(lbl.style, {
            fontSize: "1.5rem", fontWeight: "bold", color: "#2d3748", marginBottom: "0.5rem"
        });

        const sub = document.createElement("span");
        sub.innerText = subtext;
        Object.assign(sub.style, {
            fontSize: "0.9rem", color: "#718096"
        });

        btn.appendChild(lbl);
        btn.appendChild(sub);
        return btn;
    }

    hide() {
        this.container.style.opacity = "0";
        setTimeout(() => this.container.remove(), 500);
    }
}
