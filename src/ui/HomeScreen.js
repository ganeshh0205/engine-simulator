export class HomeScreen {
    constructor(onStart) {
        this.onStart = onStart;
        this.container = document.createElement("div");
        Object.assign(this.container.style, {
            position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
            background: "radial-gradient(circle at center, #1a202c 0%, #000000 100%)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            zIndex: "2000", fontFamily: "'Inter', sans-serif", color: "#ffffff",
            overflow: "hidden"
        });

        // Background Animation Element (Subtle pulse)
        const bgPulse = document.createElement("div");
        Object.assign(bgPulse.style, {
            position: "absolute", width: "200vw", height: "200vh",
            background: "radial-gradient(circle, rgba(66, 153, 225, 0.1) 0%, transparent 70%)",
            animation: "pulse 10s infinite alternate",
            pointerEvents: "none"
        });
        this.container.appendChild(bgPulse);

        // Add Keyframes for pulse if not exists
        if (!document.getElementById("home-keyframes")) {
            const style = document.createElement("style");
            style.id = "home-keyframes";
            style.innerHTML = `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.5; }
                    100% { transform: scale(1.1); opacity: 0.8; }
                }
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
            `;
            document.head.appendChild(style);
        }

        this.buildUI();
        document.body.appendChild(this.container);
    }

    buildUI() {
        // Main Content Wrapper (Glassmorphism)
        const content = document.createElement("div");
        Object.assign(content.style, {
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "4rem 6rem",
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            zIndex: "10"
        });

        // Title Area
        const title = document.createElement("h1");
        title.innerHTML = "PROPULSE<span style='color: #4299e1'>AI</span>";
        Object.assign(title.style, {
            fontSize: "4rem", fontWeight: "900", letterSpacing: "2px", margin: "0 0 0.5rem 0",
            background: "linear-gradient(to right, #ffffff, #a0aec0)",
            "-webkit-background-clip": "text", "-webkit-text-fill-color": "transparent"
        });
        content.appendChild(title);

        const subtitle = document.createElement("p");
        subtitle.innerText = "Next-Gen Engine Simulation & Learning";
        Object.assign(subtitle.style, {
            fontSize: "1.25rem", color: "#a0aec0", marginBottom: "4rem", fontWeight: "300"
        });
        content.appendChild(subtitle);

        // Buttons Container
        const btnContainer = document.createElement("div");
        Object.assign(btnContainer.style, {
            display: "flex", gap: "3rem"
        });



        // AI MENTOR Button
        const btnMentor = this.createButton("START MENTORSHIP", "Guided AI Learning", "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", () => {
            this.hide();
            this.onStart("MENTOR");
        });

        // SIMULATE Button
        const btnSimulate = this.createButton("OPEN LAB", "Free Sandbox", "linear-gradient(135deg, #f6d365 0%, #fda085 100%)", () => {
            this.hide();
            this.onStart("SIMULATE");
        });

        btnContainer.appendChild(btnMentor);
        btnContainer.appendChild(btnSimulate);
        content.appendChild(btnContainer);

        this.container.appendChild(content);

        // Footer
        const footer = document.createElement("div");
        footer.innerText = "v1.0.0 Alpha • Wrapped for Performance";
        Object.assign(footer.style, {
            position: "absolute", bottom: "2rem",
            color: "rgba(255,255,255,0.3)", fontSize: "0.85rem"
        });
        this.container.appendChild(footer);
    }

    createButton(label, subtext, gradient, onClick) {
        const btn = document.createElement("button");
        Object.assign(btn.style, {
            padding: "0", // Reset for inner content
            border: "none",
            background: "transparent",
            cursor: "pointer",
            outline: "none",
            perspective: "1000px" // For 3D tilt effect if we wanted, but keeping simple for now
        });

        const inner = document.createElement("div");
        Object.assign(inner.style, {
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            width: "220px", height: "140px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        });

        // Hover Effects applied to 'inner' via JS events on 'btn'
        btn.onmouseover = () => {
            inner.style.transform = "translateY(-8px) scale(1.02)";
            inner.style.background = gradient;
            inner.style.borderColor = "transparent";
            inner.style.boxShadow = "0 20px 30px rgba(0,0,0,0.3)";
            titleText.style.color = "#fff"; // Ensure text is white on gradient
            subText.style.color = "rgba(255,255,255,0.9)";
        };
        btn.onmouseout = () => {
            inner.style.transform = "translateY(0) scale(1)";
            inner.style.background = "rgba(255,255,255,0.05)";
            inner.style.borderColor = "rgba(255,255,255,0.1)";
            inner.style.boxShadow = "none";
            titleText.style.color = "#fff";
            subText.style.color = "#a0aec0";
        };
        btn.onclick = onClick;

        const titleText = document.createElement("span");
        titleText.innerText = label;
        Object.assign(titleText.style, {
            fontSize: "1.5rem", fontWeight: "700", color: "#fff", marginBottom: "0.25rem",
            transition: "color 0.3s"
        });

        const subText = document.createElement("span");
        subText.innerText = subtext;
        Object.assign(subText.style, {
            fontSize: "0.9rem", color: "#a0aec0", fontWeight: "400",
            transition: "color 0.3s"
        });

        inner.appendChild(titleText);
        inner.appendChild(subText);
        btn.appendChild(inner);

        return btn;
    }

    hide() {
        this.container.style.transition = "opacity 0.8s ease";
        this.container.style.opacity = "0";
        setTimeout(() => this.container.remove(), 800);
    }
}
