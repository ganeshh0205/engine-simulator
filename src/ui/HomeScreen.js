import { dbManager } from "../core/DatabaseManager.js";

export class HomeScreen {
    constructor(onStart) {
        this.onStart = onStart;
        this.isMobile = window.innerWidth <= 768; // Simple check for init level

        this.container = document.createElement("div");
        this.container.className = "anim-fade-in";
        Object.assign(this.container.style, {
            position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
            background: "radial-gradient(circle at center, #111 0%, #000 100%)", /* Premium Dark */
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
            zIndex: "2000", fontFamily: "'Inter', sans-serif", color: "#ffffff",
            overflowX: "hidden", overflowY: "auto"
        });

        // Background Animation Element (Subtle Cinematic Fog)
        const bgPulse = document.createElement("div");
        Object.assign(bgPulse.style, {
            position: "absolute", width: "200vw", height: "200vh", top: "-50vh", left: "-50vw",
            background: "radial-gradient(circle, rgba(0, 240, 255, 0.05) 0%, transparent 60%)",
            animation: "pulse 15s infinite alternate",
            pointerEvents: "none", zIndex: "0"
        });
        this.container.appendChild(bgPulse);

        // Add Keyframes
        if (!document.getElementById("home-keyframes")) {
            const style = document.createElement("style");
            style.id = "home-keyframes";
            style.innerHTML = `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.3; }
                    100% { transform: scale(1.1); opacity: 0.6; }
                }
                .hover-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 20px 40px rgba(0,0,0,0.6);
                    border-color: rgba(255,255,255,0.3) !important;
                }
                .hover-card:active {
                    transform: scale(0.98);
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
                width: "100%",
                // Fix: Add Safe Area Padding + Base Padding
                padding: this.isMobile ? "max(40px, env(safe-area-inset-top)) 20px 20px 20px" : "40px 50px 20px 50px",
                display: "flex", justifyContent: "space-between", alignItems: "center", boxSizing: "border-box",
                zIndex: "50", position: "relative",
                // Glassmorphism for Header
                background: "linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0))",
                backdropFilter: "blur(5px)"
            });

            const welcome = document.createElement("div");
            welcome.innerHTML = `
                <div style="font-size:0.7rem; color:#94a3b8; letter-spacing:2px; margin-bottom:6px; font-weight:700; text-transform:uppercase;">
                    <span style="color:#10b981; margin-right:6px;">●</span> ONLINE
                </div>
                <div style="font-size:${this.isMobile ? '1.25rem' : '1.5rem'}; color:white; font-family:var(--font-display); font-weight:700;">
                    HELLO, <span style="background:linear-gradient(135deg, #fff 0%, #cbd5e1 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${user.name || user.username}</span>
                </div>
            `;

            header.appendChild(welcome);

            // Premium "Logout" Button
            const logoutBtn = document.createElement("button");
            logoutBtn.innerHTML = `
                <span style="opacity:0.8">LOGOUT</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left:6px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            `;
            Object.assign(logoutBtn.style, {
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0", padding: "8px 14px", borderRadius: "30px", cursor: "pointer",
                fontSize: "0.7rem", letterSpacing: "1px", fontWeight: "700",
                display: "flex", alignItems: "center", transition: "all 0.2s ease"
            });
            logoutBtn.onmouseover = () => {
                logoutBtn.style.background = "rgba(255,255,255,0.15)";
                logoutBtn.style.borderColor = "rgba(255,255,255,0.3)";
            };
            logoutBtn.onmouseout = () => {
                logoutBtn.style.background = "rgba(255,255,255,0.05)";
                logoutBtn.style.borderColor = "rgba(255,255,255,0.1)";
            };
            logoutBtn.onclick = () => dbManager.logout();

            header.appendChild(logoutBtn);
            this.container.appendChild(header);
        }

        // Main Content Wrapper
        const content = document.createElement("div");
        Object.assign(content.style, {
            display: "flex", flexDirection: "column",
            alignItems: this.isMobile ? "center" : "flex-start",
            padding: this.isMobile ? "0 20px 80px 20px" : "0",
            width: this.isMobile ? "100%" : "80%",
            maxWidth: "1200px", zIndex: "10",
            boxSizing: "border-box",
            flex: "1", justifyContent: "center" // Center vertically on desktop
        });

        // Title Area
        const titleArea = document.createElement("div");
        titleArea.style.marginBottom = this.isMobile ? "40px" : "60px";
        if (this.isMobile) titleArea.style.textAlign = "center";

        const title = document.createElement("h1");
        // Responsive Font Size logic
        title.innerHTML = "PROPULSE<span style='color: var(--accent-primary)'>AI</span>";
        Object.assign(title.style, {
            fontSize: this.isMobile ? "2.5rem" : "4.5rem",
            fontWeight: "900", letterSpacing: "-2px", margin: "0 0 0.5rem 0",
            fontFamily: "var(--font-display)",
            background: "linear-gradient(to right, #ffffff, #94a3b8)",
            "-webkit-background-clip": "text", "-webkit-text-fill-color": "transparent"
        });

        const subtitle = document.createElement("p");
        subtitle.innerText = "Advanced Engineering Simulation Suite";
        Object.assign(subtitle.style, {
            fontSize: this.isMobile ? "1rem" : "1.2rem",
            color: "var(--text-muted)", fontWeight: "400",
            maxWidth: "600px", lineHeight: "1.6",
            borderLeft: this.isMobile ? "none" : "3px solid var(--accent-secondary)", // Premium accent
            paddingLeft: this.isMobile ? "0" : "15px"
        });

        titleArea.appendChild(title);
        titleArea.appendChild(subtitle);
        content.appendChild(titleArea);

        // Grid Container
        const grid = document.createElement("div");
        Object.assign(grid.style, {
            display: "grid",
            gridTemplateColumns: this.isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
            width: "100%"
        });

        // 1. AI MENTORSHIP
        grid.appendChild(this.createCard({
            title: "ACADEMY",
            subtitle: "Interactive Curriculum",
            icon: `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`,
            gradient: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
            border: "#667eea",
            onClick: () => { this.hide(); this.onStart("MENTOR"); }
        }));

        // 2. SIMULATION LABORATORY
        grid.appendChild(this.createCard({
            title: "SIMULATION LAB",
            subtitle: "Physics Sandbox",
            icon: `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>`,
            gradient: "linear-gradient(135deg, rgba(246, 211, 101, 0.1) 0%, rgba(253, 160, 133, 0.1) 100%)",
            border: "#fda085",
            onClick: () => { this.hide(); this.onStart("SIMULATE"); }
        }));

        // 3. USER PROFILE
        grid.appendChild(this.createCard({
            title: "PROFILE",
            subtitle: "Progress & Settings",
            icon: `<svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
            gradient: "linear-gradient(135deg, rgba(224, 195, 252, 0.1) 0%, rgba(142, 197, 252, 0.1) 100%)",
            border: "#a3bffa",
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
        footer.innerHTML = "SYSTEM READY • v2.0 MOBILE • <span style='opacity:0.5'>PREMIUM</span>";
        Object.assign(footer.style, {
            padding: "20px", width: "100%", textAlign: "center",
            color: "rgba(255,255,255,0.2)", fontSize: "0.7rem", fontFamily: "monospace", letterSpacing: "2px",
            boxSizing: "border-box"
        });
        this.container.appendChild(footer);
    }

    createCard({ title, subtitle, icon, gradient, border, onClick }) {
        const card = document.createElement("div");
        card.className = "glass-panel hover-card"; // Use Global + Local Animation Class
        Object.assign(card.style, {
            background: gradient,
            border: `1px solid rgba(255,255,255,0.05)`, // Base border
            // Accent border on left
            borderLeft: `4px solid ${border}`,
            borderRadius: "16px",
            padding: "25px",
            cursor: "pointer",
            transition: "all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
            position: "relative",
            overflow: "hidden",
            display: "flex", flexDirection: "row", // Horizontal layout for cards looks nice and premium
            alignItems: "center", justifyContent: "space-between",
            height: this.isMobile ? "100px" : "200px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
        });

        if (!this.isMobile) {
            card.style.flexDirection = "column";
            card.style.alignItems = "flex-start";
            card.style.justifyContent = "space-between";
        }

        card.addEventListener('click', onClick);

        // Content
        const textGroup = document.createElement("div");

        const h2 = document.createElement("h2");
        h2.innerText = title;
        Object.assign(h2.style, {
            fontSize: this.isMobile ? "1.2rem" : "1.5rem",
            fontWeight: "700", margin: "0 0 5px 0", color: "white",
            fontFamily: "var(--font-display)", letterSpacing: "1px"
        });

        const p = document.createElement("p");
        p.innerText = subtitle;
        Object.assign(p.style, { fontSize: "0.9rem", color: "var(--text-muted)", margin: "0" });

        textGroup.appendChild(h2);
        textGroup.appendChild(p);

        // Icon/Graphic
        const iconEl = document.createElement("div");
        iconEl.innerHTML = icon;
        Object.assign(iconEl.style, {
            color: border,
            opacity: "0.8",
            transform: this.isMobile ? "scale(0.8)" : "scale(1)",
            transition: "transform 0.5s ease"
        });

        card.appendChild(textGroup);
        card.appendChild(iconEl);

        return card;
    }

    hide() {
        this.container.style.transition = "opacity 0.6s ease";
        this.container.style.opacity = "0";
        setTimeout(() => this.container.remove(), 600);
    }
}
