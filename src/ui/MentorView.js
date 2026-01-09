import { Chapter1 } from "../data/Chapter1Content.js";
import { Chapter2 } from "../data/Chapter2Content.js";
import { CinematicIntroScene } from "./CinematicIntroScene.js";
import { LabScene } from "./LabScene.js";
import { dbManager } from "../core/DatabaseManager.js";
import { gsap } from "gsap"; // Ensure gsap is available or use vanilla transitions if not

export class MentorView {
    constructor(onNavigate) {
        this.onNavigate = onNavigate;
        this.currentModuleIndex = 0;
        this.currentChapter = Chapter1; // Default
        this.chapters = [Chapter1, Chapter2];
        this.activeScenes = []; // Track 3D scenes to dispose

        this.checkMobile = () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            if (wasMobile !== this.isMobile) {
                // Rerender on breakpoint change
                this.render();
            }
        };

        window.addEventListener('resize', this.checkMobile);
        this.isMobile = window.innerWidth <= 768;
        this.isDrawerOpen = !this.isMobile; // Open by default on desktop

        this.container = document.createElement("div");
        this.container.className = "anim-fade-in";
        Object.assign(this.container.style, {
            position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
            background: "#090c14", color: "#e2e8f0", fontFamily: "'Inter', sans-serif",
            display: "flex", flexDirection: "row", overflow: "hidden", zIndex: "10"
        });

        this.render();
        // FIX: Append to #app so it gets cleared automatically
        const app = document.getElementById("app");
        if (app) app.appendChild(this.container);
        else document.body.appendChild(this.container);

        // Sidebar/Drawer Toggle Listener
        if (this.isMobile) {
            // Close drawer when clicking outside?
            // implemented via overlay in renderSidebar
        }
    }

    render() {
        // Enforce Global Styles for Math & Animations
        if (!document.getElementById("mentor-animations")) {
            const style = document.createElement("style");
            style.id = "mentor-animations";
            style.innerHTML = `
                @keyframes slideRight { 
                    0% { transform: translateX(-60px); opacity: 0; } 
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { transform: translateX(60px); opacity: 0; } 
                }
                .anim-slide-right { animation: slideRight 3s linear infinite; }
                
                /* Math Formatting */
                .math-eqn {
                    font-family: 'Times New Roman', serif;
                    font-style: italic;
                    font-size: 1.3rem;
                    text-align: center;
                    margin: 20px 0;
                    color: #e2e8f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .fraction { display: inline-flex; flex-direction: column; align-items: center; vertical-align: middle; margin: 0 5px; }
                .numerator { border-bottom: 2px solid #a0aec0; padding-bottom: 2px; display: block; width: 100%; text-align: center; }
                .denominator { padding-top: 2px; display: block; width: 100%; text-align: center; }
                
                .visual-box {
                    background: rgba(255,255,255,0.03); 
                    border-radius: 12px; 
                    padding: 20px; 
                    margin-bottom: 20px; 
                    border: 1px dashed var(--accent-primary);
                    display: flex; flex-direction: column; gap: 20px; align-items: center;
                }

                /* RESPONSIVE SCENE CONTAINER */
                .scene-container {
                    width: 100%;
                    height: 500px; /* Desktop Default */
                    background: black;
                    border-radius: 12px;
                    overflow: hidden;
                    position: relative;
                    margin-bottom: 30px;
                    border: 1px solid rgba(255,255,255,0.1);
                    transition: height 0.3s ease;
                }

                @media (max-width: 1024px) {
                    .scene-container {
                        height: 65vh !important; /* Mobile/Tablet Portrait: Use 65% of screen */
                        margin-bottom: 0 !important; /* Flush with bottom sheet */
                        border-radius: 12px 12px 0 0; /* Attach to bottom sheet visually */
                    }
                }

                 @media (max-height: 500px) {
                    .scene-container {
                        height: 85vh !important; /* Landscape Mobile */
                    }
                }
            `;
            document.head.appendChild(style);
        }

        this.container.innerHTML = "";

        // 1. Sidebar (Drawer)
        this.renderSidebar();

        // 2. Main Content Area
        this.renderContent();

        // 3. Hamburger Button (Mobile Only)
        if (this.isMobile) {
            const fab = document.createElement("button");
            // Hamburger SVG
            fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
            fab.className = "btn-primary";
            Object.assign(fab.style, {
                position: "absolute",
                top: "calc(15px + env(safe-area-inset-top))", // Safe Area Fix
                left: "15px", zIndex: "9999", // High Z-Index
                padding: "0", width: "45px", height: "45px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
            });
            fab.onclick = (e) => {
                e.stopPropagation();
                this.toggleDrawer();
            };
            this.container.appendChild(fab);

            // HOME BUTTON (Right Side)
            const homeBtn = document.createElement("button");
            // Home SVG
            homeBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
            homeBtn.className = "btn-secondary"; // Darker background
            Object.assign(homeBtn.style, {
                position: "absolute",
                top: "calc(15px + env(safe-area-inset-top))", // Safe Area Fix
                right: "15px", zIndex: "2000",
                width: "45px", height: "45px", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.8)",
                background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.4)",
                padding: "0" // Ensure no padding shrinks the icon
            });
            homeBtn.onclick = () => { if (this.onNavigate) this.onNavigate("HOME"); };
            this.container.appendChild(homeBtn);
        }
    }

    toggleDrawer() {
        this.isDrawerOpen = !this.isDrawerOpen;
        const drawer = document.getElementById("mentor-drawer");
        const overlay = document.getElementById("mentor-overlay");

        if (drawer) {
            drawer.style.transform = this.isDrawerOpen ? "translateX(0)" : "translateX(-100%)";
        }
        if (overlay) {
            overlay.style.display = this.isDrawerOpen ? "block" : "none";
            // animate opacity for polish?
            overlay.style.opacity = this.isDrawerOpen ? "1" : "0";
        }
    }

    renderSidebar() {
        // Overlay for mobile
        if (this.isMobile) {
            const existingOverlay = document.getElementById("mentor-overlay");
            if (existingOverlay) existingOverlay.remove();

            const overlay = document.createElement("div");
            overlay.id = "mentor-overlay";
            Object.assign(overlay.style, {
                position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
                background: "rgba(0,0,0,0.6)", backdropFilter: "blur(5px)",
                zIndex: "1000", display: this.isDrawerOpen ? "block" : "none",
                transition: "opacity 0.3s ease",
            });
            overlay.onclick = () => this.toggleDrawer();
            this.container.appendChild(overlay);
        }

        const existingDrawer = document.getElementById("mentor-drawer");
        if (existingDrawer) existingDrawer.remove();

        const sidebar = document.createElement("div");
        sidebar.id = "mentor-drawer";
        Object.assign(sidebar.style, {
            position: this.isMobile ? "absolute" : "relative",
            left: "0", top: "0", height: "100%",
            width: this.isMobile ? "280px" : "320px",
            background: "#050505", // Deep black
            borderRight: "1px solid rgba(255,255,255,0.1)",
            padding: "80px 20px 20px 20px", // Top padding for mobile fab space
            display: "flex", flexDirection: "column",
            zIndex: "1001",
            transition: "transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
            transform: this.isMobile && !this.isDrawerOpen ? "translateX(-100%)" : "translateX(0)",
            boxShadow: "5px 0 30px rgba(0,0,0,0.5)"
        });

        if (!this.isMobile) {
            sidebar.style.paddingTop = "30px";
        } else {
            // Fix: Safe Area for Mobile Sidebar
            sidebar.style.paddingTop = "max(30px, env(safe-area-inset-top))";
        }

        // Sidebar Title
        const title = document.createElement("div");
        title.innerHTML = "PROPULSE<span style='color:var(--accent-primary)'>AI</span>";
        Object.assign(title.style, {
            fontSize: "1.5rem", fontWeight: "800", color: "white", marginBottom: "30px",
            letterSpacing: "-1px", paddingLeft: "10px",
            display: this.isMobile ? "none" : "block" // Hide title on mobile drawer since usage flow differs
        });
        sidebar.appendChild(title);

        const listContainer = document.createElement("div");
        Object.assign(listContainer.style, { flex: "1", overflowY: "auto" });

        this.chapters.forEach(chapter => {
            const chTitle = document.createElement("div");
            chTitle.innerText = chapter.title.toUpperCase();
            Object.assign(chTitle.style, {
                fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "15px",
                paddingLeft: "10px", letterSpacing: "1px", marginTop: "10px"
            });
            listContainer.appendChild(chTitle);

            chapter.modules.forEach((mod, modIdx) => {
                const item = document.createElement("button");
                const status = dbManager.getModuleStatus(mod.id);
                const isLocked = status === 'locked';
                const isCompleted = status === 'completed';
                const isActive = (chapter === this.currentChapter) && (modIdx === this.currentModuleIndex);

                let icon = "";
                if (isCompleted) icon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#48bb78" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                else if (isLocked) icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#718096" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
                else icon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;

                item.innerHTML = `<span style="margin-right:12px; display:flex; align-items:center;">${icon}</span> ${mod.title}`;

                Object.assign(item.style, {
                    width: "100%", textAlign: "left",
                    padding: "12px 16px", borderRadius: "8px", marginBottom: "8px",
                    cursor: isLocked ? "not-allowed" : "pointer",
                    background: isActive ? "rgba(0, 240, 255, 0.1)" : "transparent",
                    color: isActive ? "var(--accent-primary)" : (isLocked ? "#4a5568" : "#a0aec0"),
                    border: isActive ? "1px solid rgba(0,240,255,0.3)" : "1px solid transparent",
                    fontWeight: isActive ? "600" : "400",
                    opacity: isLocked ? "0.6" : "1.0",
                    transition: "all 0.2s"
                });

                if (!isLocked) {
                    item.onclick = () => {
                        this.currentChapter = chapter;
                        this.currentModuleIndex = modIdx;
                        this.renderContent(); // Re-render content
                        if (this.isMobile) this.toggleDrawer(); // Close drawer
                    };
                }
                listContainer.appendChild(item);
            });
        });
        sidebar.appendChild(listContainer);

        // Back to Home
        const homeBtn = document.createElement("button");
        homeBtn.className = "btn-secondary";
        homeBtn.innerHTML = "← MAIN MENU";
        Object.assign(homeBtn.style, {
            width: "100%", marginTop: "10px",
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            color: "white", padding: "12px", borderRadius: "8px", cursor: "pointer",
            fontWeight: "bold"
        });
        homeBtn.onmouseover = () => homeBtn.style.background = "rgba(255,255,255,0.2)";
        homeBtn.onmouseout = () => homeBtn.style.background = "rgba(255,255,255,0.1)";

        homeBtn.onclick = () => {
            if (this.onNavigate) this.onNavigate("HOME");
        };
        sidebar.appendChild(homeBtn);

        this.container.appendChild(sidebar);
    }

    renderContent() {
        // Remove old main if exists
        const existingMain = document.getElementById("mentor-content");
        if (existingMain) existingMain.remove();

        // Cleanup scenes
        this.activeScenes.forEach(s => s.dispose && s.dispose());
        this.activeScenes = [];

        const module = this.currentChapter.modules[this.currentModuleIndex];
        const sections = module.sections;

        const main = document.createElement("div");
        main.id = "mentor-content";
        Object.assign(main.style, {
            flex: "1",
            padding: this.isMobile ? "80px 20px 40px 20px" : "40px 60px",
            overflowY: "auto", position: "relative",
            scrollBehavior: "smooth"
        });

        // Header
        const header = document.createElement("h1");
        header.innerText = module.title;
        Object.assign(header.style, {
            fontSize: this.isMobile ? "2rem" : "2.5rem",
            fontWeight: "800", color: "#f7fafc", marginBottom: "30px",
            borderBottom: "2px solid var(--accent-primary)", paddingBottom: "10px", display: "inline-block"
        });
        main.appendChild(header);

        // --- PROGRESSION LOGIC ---
        let requiredInteractions = 0;
        let completedInteractions = 0;

        sections.forEach(sec => {
            if (sec.type === "questions") requiredInteractions += sec.questions ? sec.questions.length : 0;
            else if (sec.type === "concept_check") requiredInteractions++;
        });

        const checkCompletion = () => {
            if (completedInteractions >= requiredInteractions) {
                if (this.nextBtn) {
                    this.nextBtn.disabled = false;
                    this.nextBtn.style.opacity = "1";
                    this.nextBtn.style.cursor = "pointer";
                    this.nextBtn.innerText = "NEXT MODULE →";
                    this.nextBtn.className = "btn-primary";
                }
                if (this.finishBtn) {
                    this.finishBtn.disabled = false;
                    this.finishBtn.style.opacity = "1";
                    this.finishBtn.style.cursor = "pointer";
                }
            }
        };

        // Sections Rendering
        sections.forEach(sec => {
            const block = document.createElement("div");
            block.style.marginBottom = "40px";

            switch (sec.type) {
                case "lab_scene":
                    const wrapper = document.createElement("div");
                    wrapper.className = "scene-container"; // Use CSS class for responsive height

                    block.appendChild(wrapper);
                    if (sec.type === "cinematic_scene") this.activeScenes.push(new CinematicIntroScene(wrapper, sec));
                    else this.activeScenes.push(new LabScene(wrapper, sec));
                    break;

                case "explanation":
                    block.innerHTML = `
                        <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px;">1. Concept</div>
                        <p style="font-size: 1.15rem; line-height: 1.6; color: var(--text-main); border-left: 4px solid var(--accent-primary); padding-left: 16px;">${this.formatText(sec.content)}</p>
                    `;
                    break;

                // ... (Visual Grounding, Intuition Builder, etc - Simplification for brevity while keeping premium feel)
                case "visual_grounding":
                case "intuition_builder":
                case "clarification":
                case "context":
                case "thought_experiment":
                    // Generic Card for Text Content
                    const card = document.createElement("div");
                    card.className = "glass-panel"; // Use our global glass panel
                    card.style.padding = "20px";

                    let accentColor = "var(--accent-primary)";
                    let title = "Insight";
                    if (sec.type === 'thought_experiment') { accentColor = "#90cdf4"; title = "Thought Experiment"; }
                    if (sec.type === 'context') { accentColor = "#ed8936"; title = "Context"; }

                    card.innerHTML = `
                         <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: ${accentColor}; margin-bottom: 10px;">${title}</div>
                         <div style="font-size: 1.05rem; color: #cbd5e0; line-height:1.6;">${this.formatText(sec.content)}</div>
                    `;
                    block.appendChild(card);

                    // Handle embedded visuals
                    if (sec.visual) {
                        const vDiv = document.createElement("div");
                        vDiv.style.marginTop = "20px";
                        vDiv.innerHTML = `<div style="background:rgba(255,255,255,0.05); padding:20px; border-radius:10px; text-align:center;">${sec.visual.content}</div>`;
                        block.appendChild(vDiv);
                    }
                    break;

                case "questions":
                    block.innerHTML = `<div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px;">Understanding Check</div>`;
                    sec.questions.forEach((q, idx) => {
                        block.appendChild(this.createConceptCheck(q, idx, () => {
                            completedInteractions++;
                            checkCompletion();
                        }));
                    });
                    break;
            }
            main.appendChild(block);
        });

        // --- GAMIFICATION REMOVED AS REQUESTED ---

        // Footer Separator
        const footer = document.createElement("div");
        footer.style.marginTop = "40px";
        footer.style.borderTop = "1px solid rgba(255,255,255,0.1)";
        footer.style.paddingTop = "20px";
        main.appendChild(footer);


        // Next Button Area
        const nextWrapper = document.createElement("div");
        Object.assign(nextWrapper.style, {
            marginTop: "60px", paddingBottom: "40px", display: "flex", justifyContent: "flex-end"
        });

        if (this.currentModuleIndex < this.currentChapter.modules.length - 1) {
            this.nextBtn = document.createElement("button");
            this.nextBtn.className = "btn-secondary"; // Default locked
            this.nextBtn.innerText = requiredInteractions > 0 ? "🔒 COMPLETE TASKS" : "NEXT MODULE →";

            if (requiredInteractions > 0) {
                this.nextBtn.disabled = true;
                this.nextBtn.style.opacity = "0.5";
            } else {
                this.nextBtn.className = "btn-primary";
            }

            this.nextBtn.onclick = () => {
                dbManager.completeModule(module.id);
                // Force Sidebar Checkmark Update
                this.renderSidebar();

                this.currentModuleIndex++;
                this.renderContent(); // Re-render in place
                main.scrollTop = 0;
            };
            nextWrapper.appendChild(this.nextBtn);
        } else {
            // End of Chapter
            this.finishBtn = document.createElement("button");
            this.finishBtn.className = "btn-primary";
            this.finishBtn.innerText = "COMPLETE CHAPTER";

            const canFinish = (requiredInteractions === 0 || completedInteractions >= requiredInteractions);
            if (!canFinish) {
                this.finishBtn.disabled = true;
                this.finishBtn.style.opacity = "0.5";
                this.finishBtn.innerText = "FINISH TASKS";
            }

            this.finishBtn.onclick = () => {
                dbManager.completeModule(module.id);

                // Find next module/chapter
                const currentChIndex = this.chapters.indexOf(this.currentChapter);
                // Check if there is a next module in this chapter (unlikely if we are at finish btn, but safety check)
                if (this.currentModuleIndex < this.currentChapter.modules.length - 1) {
                    this.currentModuleIndex++;
                    this.renderContent();
                    return;
                }

                // Check for next chapter
                if (currentChIndex < this.chapters.length - 1) {
                    const nextChapter = this.chapters[currentChIndex + 1];
                    console.log("Advancing to Chapter:", nextChapter.title);

                    // 1. Update State
                    this.currentChapter = nextChapter;
                    this.currentModuleIndex = 0;

                    // 2. Force Sidebar Update (by re-rendering whole view)
                    // The sidebar logic uses `this.currentChapter` to highlight active item
                    this.render();

                    // 3. Scroll to top
                    const main = document.getElementById("mentor-content");
                    if (main) main.scrollTop = 0;

                } else {
                    // Truly done
                    console.log("Curriculum Complete. Returning Home.");
                    this.onNavigate("HOME");
                }
            };
            nextWrapper.appendChild(this.finishBtn);
        }

        footer.appendChild(nextWrapper); // Append to footer, not main directly for better spacing
        // main.appendChild(footer); // Already appended above
        this.container.appendChild(main);
    }

    createConceptCheck(data, index, onCorrect) {
        const wrapper = document.createElement("div");
        wrapper.className = "glass-panel";
        Object.assign(wrapper.style, { padding: "24px", marginBottom: "20px" });

        const label = document.createElement("div");
        label.innerText = `QUESTION ${index + 1}`;
        Object.assign(label.style, { fontSize: "0.75rem", fontWeight: "bold", color: "var(--text-muted)", marginBottom: "10px", letterSpacing: "1px" });
        wrapper.appendChild(label);

        const prompt = document.createElement("div");
        prompt.innerText = data.prompt;
        Object.assign(prompt.style, { fontSize: "1.1rem", fontWeight: "600", color: "white", marginBottom: "20px" });
        wrapper.appendChild(prompt);

        const optionsArea = document.createElement("div");
        Object.assign(optionsArea.style, { display: "flex", flexDirection: "column", gap: "10px" });

        const feedback = document.createElement("div");
        Object.assign(feedback.style, { display: "none", marginTop: "20px", padding: "15px", borderRadius: "8px" });

        data.options.forEach(opt => {
            const btn = document.createElement("button");
            btn.className = "btn-secondary";
            btn.innerText = opt.label;
            Object.assign(btn.style, { textAlign: "left", width: "100%" });

            btn.onclick = () => {
                // ... (Existing logic adapted for new styles)
                if (opt.isCorrect) {
                    btn.style.borderColor = "var(--success)";
                    btn.style.background = "rgba(34, 197, 94, 0.1)";
                    feedback.innerHTML = `<strong style="color:var(--success)">Correct!</strong> ${opt.feedback}`;
                    feedback.style.display = "block";
                    onCorrect();
                } else {
                    btn.style.borderColor = "var(--danger)";
                    feedback.innerHTML = `<strong style="color:var(--danger)">Incorrect.</strong> ${opt.feedback}`;
                    feedback.style.display = "block";
                }
            };
            optionsArea.appendChild(btn);
        });

        wrapper.appendChild(optionsArea);
        wrapper.appendChild(feedback);
        return wrapper;
    }

    formatText(text) {
        return text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:white;">$1</strong>');
    }
    getRank(xp) {
        if (xp < 500) return "CADET ENGINEER";
        if (xp < 1000) return "FLIGHT OFFICER";
        return "CHIEF TEST PILOT";
    }

    getNextRankXP(xp) {
        if (xp < 500) return 500;
        if (xp < 1000) return 1000;
        return 2000;
    }
}
