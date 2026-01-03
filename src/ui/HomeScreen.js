import { dbManager } from "../core/DatabaseManager.js";
export class HomeScreen {
    constructor(onStart) {
        this.onStart = onStart;
        this.container = document.createElement("div");
        this.container.className = "anim-fade-in";
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
        // --- Header (User Profile) ---
        const user = dbManager.getCurrentUser();
        if (user) {
            const header = document.createElement("div");
            Object.assign(header.style, {
                position: "absolute", top: "0", left: "0", width: "100%", padding: "30px 50px",
                display: "flex", justifyContent: "space-between", alignItems: "center", boxSizing: "border-box",
                zIndex: "50"
            });

            const welcome = document.createElement("div");
            welcome.innerHTML = `<div style="font-size:0.9rem; color:var(--text-muted); margin-bottom:4px;">STATUS: ONLINE</div><div style="font-size:1.4rem; color:white; font-family:var(--font-display);">WELCOME, <span style="color:var(--accent-primary);">${user.name || user.username}</span></div>`;

            header.appendChild(welcome);
            // Removed redundant Profile Button (Use Dashboard Card)
            this.container.appendChild(header);
        }

        // Main Content Wrapper
        const content = document.createElement("div");
        Object.assign(content.style, {
            display: "flex", flexDirection: "column", alignItems: "flex-start",
            padding: "0", width: "80%", maxWidth: "1200px", zIndex: "10"
        });

        // Title Area
        const titleArea = document.createElement("div");
        titleArea.style.marginBottom = "60px";

        const title = document.createElement("h1");
        title.innerHTML = "PROPULSE<span style='color: #4299e1'>AI</span> <span style='font-size:1.5rem; color:#4a5568; font-weight:300;'>ENGINEERING SUITE</span>";
        Object.assign(title.style, {
            fontSize: "4.5rem", fontWeight: "900", letterSpacing: "-2px", margin: "0 0 1rem 0",
            background: "linear-gradient(to right, #ffffff, #a0aec0)",
            "-webkit-background-clip": "text", "-webkit-text-fill-color": "transparent"
        });

        const subtitle = document.createElement("p");
        subtitle.innerText = "Select a module to begin your simulation session.";
        Object.assign(subtitle.style, {
            fontSize: "1.2rem", color: "#a0aec0", fontWeight: "400", maxWidth: "600px", lineHeight: "1.6"
        });

        titleArea.appendChild(title);
        titleArea.appendChild(subtitle);
        content.appendChild(titleArea);

        // Grid Container
        const grid = document.createElement("div");
        Object.assign(grid.style, {
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px",
            width: "100%"
        });

        // 1. AI MENTORSHIP
        grid.appendChild(this.createCard({
            title: "ACADEMY",
            subtitle: "Interactive propulsion curriculum.",
            icon: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`,
            color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            onClick: () => { this.hide(); this.onStart("MENTOR"); }
        }));

        // 2. SIMULATION LABORATORY
        grid.appendChild(this.createCard({
            title: "SIMULATION LAB",
            subtitle: "Physics-accurate sandbox environment.",
            icon: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fda085" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>`,
            color: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
            onClick: () => { this.hide(); this.onStart("SIMULATE"); }
        }));

        // 3. USER PROFILE
        grid.appendChild(this.createCard({
            title: "USER PROFILE",
            subtitle: "Track progress & settings.",
            icon: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#a3bffa" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
            color: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
            onClick: () => {
                import("./ProfileView.js").then(({ ProfileView }) => {
                    new ProfileView(() => { });
                });
            }
        }));

        content.appendChild(grid);
        this.container.appendChild(content);

        // Footer
        const footer = document.createElement("div");
        footer.innerHTML = "SYSTEM READY • v1.0.0 Alpha • <span style='opacity:0.5'>High Performance Mode Active</span>";
        Object.assign(footer.style, {
            position: "absolute", bottom: "30px", width: "100%", textAlign: "center",
            color: "rgba(255,255,255,0.2)", fontSize: "0.8rem", fontFamily: "monospace", letterSpacing: "2px"
        });
        this.container.appendChild(footer);
    }

    createCard({ title, subtitle, icon, color, onClick }) {
        const card = document.createElement("div");
        Object.assign(card.style, {
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "20px",
            padding: "40px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            position: "relative",
            overflow: "hidden",
            display: "flex", flexDirection: "column", justifyContent: "space-between",
            height: "240px"
        });

        // Hover Effect
        card.onmouseenter = () => {
            card.style.transform = "translateY(-10px)";
            card.style.background = "rgba(255,255,255,0.08)";
            card.style.borderColor = "rgba(255,255,255,0.2)";
            card.style.boxShadow = "0 20px 40px rgba(0,0,0,0.4)";
            iconEl.style.transform = "scale(1.2) rotate(5deg)";
        };
        card.onmouseleave = () => {
            card.style.transform = "translateY(0)";
            card.style.background = "rgba(255,255,255,0.03)";
            card.style.borderColor = "rgba(255,255,255,0.05)";
            card.style.boxShadow = "none";
            iconEl.style.transform = "scale(1) rotate(0deg)";
        };
        card.onclick = onClick;

        // Content
        const top = document.createElement("div");
        const h2 = document.createElement("h2");
        h2.innerText = title;
        Object.assign(h2.style, { fontSize: "1.5rem", fontWeight: "700", marginBottom: "10px", color: "white" });

        const p = document.createElement("p");
        p.innerText = subtitle;
        Object.assign(p.style, { fontSize: "1rem", color: "#a0aec0", lineHeight: "1.5" });

        top.appendChild(h2);
        top.appendChild(p);

        // Icon/Graphic
        const iconEl = document.createElement("div");
        iconEl.innerHTML = icon; // Use innerHTML for SVG
        Object.assign(iconEl.style, {
            position: "absolute", bottom: "20px", right: "30px", opacity: "0.8",
            transition: "all 0.5s ease"
        });

        // Accent Line
        const accent = document.createElement("div");
        Object.assign(accent.style, {
            position: "absolute", top: "0", left: "0", width: "100%", height: "4px", background: color
        });

        card.appendChild(accent);
        card.appendChild(top);
        card.appendChild(iconEl);

        return card;
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
