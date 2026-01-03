import { dbManager } from "../core/DatabaseManager.js";
import { CURRICULUM } from "../data/curriculum-data.js";
import { gsap } from "gsap";

export class ProfileView {
    constructor(onClose) {
        this.onClose = onClose;
        this.user = dbManager.getCurrentUser();
        this.progress = dbManager.getStudentProgress();

        this.container = document.createElement("div");
        this.container.className = "anim-fade-in";
        Object.assign(this.container.style, {
            position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
            background: "rgba(9, 12, 20, 0.95)",
            backdropFilter: "blur(15px)",
            zIndex: "3000",
            display: "flex", justifyContent: "center", alignItems: "center",
            fontFamily: "'Inter', sans-serif", color: "white"
        });

        this.buildUI();
        document.body.appendChild(this.container);
    }

    buildUI() {
        if (!this.user) {
            this.container.innerText = "Error: No User Logged In";
            return;
        }

        const panel = document.createElement("div");
        panel.className = "glass-panel";
        Object.assign(panel.style, {
            width: "800px", height: "600px", display: "grid", gridTemplateColumns: "300px 1fr",
            overflow: "hidden", border: "1px solid rgba(0, 240, 255, 0.2)"
        });

        // --- Left Sidebar (Identity) ---
        const sidebar = document.createElement("div");
        Object.assign(sidebar.style, {
            background: "rgba(0,0,0,0.3)", padding: "40px 20px",
            display: "flex", flexDirection: "column", alignItems: "center", borderRight: "1px solid rgba(255,255,255,0.1)"
        });

        // Avatar
        const avatar = document.createElement("div");
        avatar.innerText = this.user.name ? this.user.name[0].toUpperCase() : "P";
        Object.assign(avatar.style, {
            width: "100px", height: "100px", borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
            display: "flex", justifyContent: "center", alignItems: "center",
            fontSize: "3rem", fontWeight: "bold", boxShadow: "0 0 20px rgba(0, 240, 255, 0.5)",
            marginBottom: "20px"
        });
        sidebar.appendChild(avatar);

        // Name
        const name = document.createElement("h2");
        name.innerText = this.user.name || "Unknown Pilot";
        name.style.margin = "0 0 5px 0";
        sidebar.appendChild(name);

        const callsign = document.createElement("div");
        callsign.innerHTML = `<span style="color:var(--text-muted)">Callsign:</span> @${this.user.username}`;
        callsign.style.fontSize = "0.9rem";
        sidebar.appendChild(callsign);

        const email = document.createElement("div");
        email.innerText = this.user.email || "No Email";
        email.style.fontSize = "0.8rem";
        email.style.color = "var(--text-muted)";
        email.style.marginTop = "5px";
        sidebar.appendChild(email);

        const joined = document.createElement("div");
        const date = new Date(this.user.joinedAt).toLocaleDateString();
        joined.innerText = `Joined: ${date}`;
        joined.style.cssText = "margin-top: auto; font-size: 0.75rem; color: rgba(255,255,255,0.3)";
        sidebar.appendChild(joined);

        // Actions
        const btnLogout = document.createElement("button");
        btnLogout.innerText = "LOGOUT";
        btnLogout.className = "btn-secondary";
        btnLogout.style.width = "100%";
        btnLogout.style.marginTop = "10px";
        btnLogout.style.borderColor = "var(--danger)";
        btnLogout.style.color = "var(--danger)";
        btnLogout.onmouseover = () => { btnLogout.style.background = "rgba(239, 68, 68, 0.1)"; };
        btnLogout.onmouseout = () => { btnLogout.style.background = "transparent"; };
        btnLogout.onclick = () => {
            dbManager.logout();
        };
        sidebar.appendChild(btnLogout);

        // --- Right Content (Progress) ---
        const content = document.createElement("div");
        Object.assign(content.style, {
            padding: "40px", overflowY: "auto"
        });

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "flex-start"; // Align with h2 top

        const h2 = document.createElement("h2");
        h2.innerText = "FLIGHT RECORD";
        h2.style.cssText = "border-bottom: 2px solid var(--accent-primary); padding-bottom: 10px; display: inline-block; margin-top: 0;";
        header.appendChild(h2);

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "&times;";
        closeBtn.style.cssText = "background:none; border:none; font-size: 2rem; color: var(--text-muted); cursor: pointer; line-height: 1;";
        closeBtn.onclick = () => this.close();
        header.appendChild(closeBtn);

        content.appendChild(header);

        // Overall Stats
        let total = 0;
        let completed = 0;
        CURRICULUM.forEach(phase => phase.modules.forEach(m => {
            total++;
            if (this.progress[m.id] && this.progress[m.id].status === 'completed') completed++;
        }));

        const pct = Math.round((completed / total) * 100);

        const statsBox = document.createElement("div");
        statsBox.style.cssText = "display: flex; gap: 20px; margin-bottom: 30px;";
        statsBox.innerHTML = `
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--accent-primary);">${pct}%</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">OVERALL COMPLETION</div>
            </div>
             <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${completed}/${total}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">MODULES CLEARED</div>
            </div>
        `;
        content.appendChild(statsBox);

        // Detailed List (The "Sheet")
        const table = document.createElement("div");
        table.style.cssText = "display: flex; flexDirection: column; gap: 2px;";

        // Header Row
        table.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 100px; padding: 10px; background: rgba(255,255,255,0.1); font-weight: bold; color: var(--text-muted); font-size: 0.8rem; border-radius: 4px 4px 0 0;">
                <div>MODULE / MISSION</div>
                <div style="text-align: right;">STATUS</div>
            </div>
        `;

        CURRICULUM.forEach(phase => {
            const pTitle = document.createElement("div");
            pTitle.innerText = phase.title.toUpperCase();
            pTitle.style.cssText = "padding: 15px 5px 5px 5px; font-size: 0.75rem; color: var(--accent-secondary); font-weight: bold; letter-spacing: 1px; margin-top: 10px;";
            table.appendChild(pTitle);

            phase.modules.forEach(mod => {
                const row = document.createElement("div");
                const info = this.progress[mod.id] || { status: 'locked' };
                let color = "#4a5568"; // gray
                let label = "LOCKED";

                if (info.status === 'unlocked') { color = "#d69e2e"; label = "IN PROGRESS"; }
                if (info.status === 'completed') { color = "#38a169"; label = "COMPLETED"; }

                row.style.cssText = "display: grid; grid-template-columns: 1fr 100px; padding: 12px 10px; background: rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;";
                row.onmouseover = () => row.style.background = "rgba(255,255,255,0.05)";
                row.onmouseout = () => row.style.background = "rgba(255,255,255,0.02)";

                row.innerHTML = `
                    <div style="color: ${info.status === 'locked' ? '#718096' : 'white'}">${mod.title}</div>
                    <div style="text-align: right; color: ${color}; font-size: 0.8rem; font-weight: 600;">${label}</div>
                 `;
                table.appendChild(row);
            });
        });

        content.appendChild(table);

        panel.appendChild(sidebar);
        panel.appendChild(content);
        this.container.appendChild(panel);

        // Anim
        gsap.from(panel, { scale: 0.95, opacity: 0, duration: 0.3 });
    }

    close() {
        gsap.to(this.container, {
            opacity: 0, duration: 0.2, onComplete: () => {
                this.container.remove();
                if (this.onClose) this.onClose();
            }
        });
    }
}
