import { CURRICULUM } from "../data/curriculum-data.js";
// import { MissionView } from "./MissionView.js"; // Deprecated

export class LearningHub {
    constructor(onBack) {
        this.onBack = onBack;
        this.activeChapter = null; // State: null = showing chapters, object = showing modules
        this.completedModules = new Set(); // Track progress

        this.container = document.createElement("div");
        Object.assign(this.container.style, {
            position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
            background: "#111", color: "white", fontFamily: "'Inter', sans-serif",
            display: "flex", flexDirection: "column",
            zIndex: "2000"
        });

        this.buildHeader();
        this.buildContent(); // Dynamic content area

        document.body.appendChild(this.container);
    }

    buildHeader() {
        this.header = document.createElement("div");
        Object.assign(this.header.style, {
            padding: "2rem", borderBottom: "1px solid #333",
            display: "flex", justifyContent: "space-between", alignItems: "center"
        });

        this.container.appendChild(this.header);
        this.updateHeader();
    }

    updateHeader() {
        this.header.innerHTML = ""; // Clear

        const title = document.createElement("h2");
        if (this.activeChapter) {
            title.innerHTML = `${this.activeChapter.title} <span style='color:#4299e1'>MODULES</span>`;
        } else {
            title.innerHTML = "ENGINEER <span style='color:#4299e1'>PROGRESSION</span>";
        }

        const btnBack = document.createElement("button");
        btnBack.innerText = this.activeChapter ? "Back to Chapters" : "Back to Home";
        Object.assign(btnBack.style, {
            background: "transparent", border: "1px solid #555", color: "#aaa",
            padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer"
        });
        btnBack.onclick = () => {
            if (this.activeChapter) {
                this.activeChapter = null; // Go up a level
                this.updateHeader();
                this.renderChapters();
            } else {
                this.container.remove();
                this.onBack(); // Exit Hub
            }
        };

        this.header.appendChild(title);
        this.header.appendChild(btnBack);
    }

    buildContent() {
        this.grid = document.createElement("div");
        Object.assign(this.grid.style, {
            flex: "1", padding: "3rem", display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem",
            overflowY: "auto", alignContent: "start"
        });
        this.container.appendChild(this.grid);

        this.renderChapters(); // Initial view
    }

    renderChapters() {
        this.grid.innerHTML = "";

        CURRICULUM.forEach((chapter) => {
            const card = this.createCard(chapter.title, chapter.goal, false, () => {
                this.activeChapter = chapter;
                this.updateHeader();
                this.renderModules(chapter);
            });
            this.grid.appendChild(card);
        });
    }

    renderModules(chapter) {
        this.grid.innerHTML = "";

        if (!chapter.modules || chapter.modules.length === 0) {
            this.grid.innerHTML = "<div style='color:#666'>No modules available.</div>";
            return;
        }

        chapter.modules.forEach((module, index) => {
            // Locking Logic
            const isFirst = index === 0;
            const prevModule = chapter.modules[index - 1];
            // Locked if not first AND previous is not in completed set
            const isLocked = !isFirst && !this.completedModules.has(prevModule.id);
            const isCompleted = this.completedModules.has(module.id);

            const card = this.createCard(
                module.title + (isCompleted ? " ✅" : "") + (isLocked ? " 🔒" : ""),
                isLocked ? "Complete previous module to unlock." : module.goal,
                isLocked,
                () => {
                    if (!isLocked) {
                        this.launchMission(module);
                    }
                }
            );
            this.grid.appendChild(card);
        });
    }

    createCard(titleText, subText, isLocked, onClick) {
        const card = document.createElement("div");
        Object.assign(card.style, {
            background: isLocked ? "#151515" : "#1a202c",
            padding: "2rem", borderRadius: "12px",
            border: "1px solid #333",
            cursor: isLocked ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            display: "flex", flexDirection: "column", gap: "1rem",
            opacity: isLocked ? "0.5" : "1"
        });

        if (!isLocked) {
            card.onmouseover = () => { card.style.borderColor = "#4299e1"; card.style.transform = "translateY(-5px)"; };
            card.onmouseout = () => { card.style.borderColor = "#333"; card.style.transform = "translateY(0)"; };
        }
        card.onclick = onClick;

        const title = document.createElement("h3");
        title.innerText = titleText;
        Object.assign(title.style, { fontSize: "1.3rem", color: isLocked ? "#777" : "#fff" });

        const sub = document.createElement("p");
        sub.innerText = subText;
        Object.assign(sub.style, { color: "#a0aec0", fontSize: "0.95rem" });

        card.appendChild(title);
        card.appendChild(sub);
        return card;
    }

    launchMission(module) {
        import("./ModuleView.js").then(({ ModuleView }) => {
            new ModuleView(module, (success) => {
                if (success) {
                    this.completedModules.add(module.id);
                    this.renderModules(this.activeChapter); // Re-render to show checkmark & unlock next
                }
            });
        });
    }
}
