import { Chapter1 } from "../data/Chapter1Content.js";
import { Chapter2 } from "../data/Chapter2Content.js";
import { CinematicIntroScene } from "./CinematicIntroScene.js";
import { LabScene } from "./LabScene.js";
import { dbManager } from "../core/DatabaseManager.js";

export class MentorView {
    constructor(onNavigate) {
        this.onNavigate = onNavigate;
        this.currentModuleIndex = 0;
        this.currentChapter = Chapter1; // Default
        this.chapters = [Chapter1, Chapter2];
        this.activeScenes = []; // Track 3D scenes to dispose
        this.container = document.createElement("div");
        this.container.className = "anim-fade-in";
        Object.assign(this.container.style, {
            position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
            background: "#f7fafc", color: "#2d3748", fontFamily: "'Inter', sans-serif",
            display: "flex", flexDirection: "row", overflow: "hidden"
        });

        this.render();
        document.body.appendChild(this.container);
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
                @keyframes racing { 
                    0% { transform: translateX(-80px); } 
                    100% { transform: translateX(80px); } 
                }
                .anim-slide-right { animation: slideRight 3s linear infinite; }
                .anim-fast { animation: racing 1s linear infinite; }
                .anim-slow { animation: racing 3s linear infinite; }
                
                /* Math Formatting */
                .math-eqn {
                    font-family: 'Times New Roman', serif;
                    font-style: italic;
                    font-size: 1.3rem;
                    text-align: center;
                    margin: 20px 0;
                    color: #2d3748;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .fraction {
                    display: inline-flex;
                    flex-direction: column;
                    align-items: center;
                    vertical-align: middle;
                    margin: 0 5px;
                }
                .numerator {
                    border-bottom: 2px solid #2d3748;
                    padding-bottom: 2px;
                    display: block;
                    width: 100%;
                    text-align: center;
                }
                .denominator {
                    padding-top: 2px;
                    display: block;
                    width: 100%;
                    text-align: center;
                }
                .si-unit {
                    font-family: 'Courier New', monospace;
                    color: #e53e3e;
                    font-weight: bold;
                }

                .visual-box {
                    background: #ebf8ff; 
                    border-radius: 8px; 
                    padding: 25px; 
                    margin-bottom: 0px; 
                    border: 1px dashed #4299e1;
                    display: flex;
                    flex-direction: column; 
                    gap: 20px;
                    align-items: center;
                }
                .frame-container {
                    background: white;
                    padding: 10px 20px;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                    width: 100%;
                    max-width: 300px;
                    text-align: center;
                }
                .frame-label {
                    font-size: 0.75rem; 
                    font-weight: bold; 
                    color: #718096; 
                    text-transform: uppercase;
                    margin-bottom: 8px;
                    letter-spacing: 1px;
                }
                .scene-stage {
                    font-size: 2rem; 
                    height: 50px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    position: relative;
                    overflow: hidden; 
                }
            `;
            document.head.appendChild(style);
        }

        this.container.innerHTML = "";

        // 1. Sidebar (Chapter Navigation)
        this.renderSidebar();

        // 2. Main Content Area
        this.renderContent();
    }

    renderSidebar() {
        const sidebar = document.createElement("div");
        Object.assign(sidebar.style, {
            width: "320px",
            height: "100%",
            background: "rgba(26, 32, 44, 0.95)", // Dark Glass
            backdropFilter: "blur(20px)",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            padding: "30px 20px",
            display: "flex", flexDirection: "column",
            boxShadow: "5px 0 15px rgba(0,0,0,0.3)",
            zIndex: "10",
            boxSizing: "border-box" // Fix: Include padding in height calculation
        });

        // Sidebar Title
        const title = document.createElement("div");
        title.innerHTML = "PROPULSE<span style='color:#4299e1'>AI</span>";
        Object.assign(title.style, {
            fontSize: "1.5rem", fontWeight: "800", color: "white", marginBottom: "40px",
            letterSpacing: "-1px", paddingLeft: "10px"
        });
        sidebar.appendChild(title);

        // Scrollable List
        const listContainer = document.createElement("div");
        Object.assign(listContainer.style, { flex: "1", overflowY: "auto", marginTop: "10px", marginBottom: "20px", paddingRight: "5px" });
        const style = document.createElement("style");
        style.innerHTML = `#mentor-sidebar-list::-webkit-scrollbar { width: 6px; } #mentor-sidebar-list::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); } #mentor-sidebar-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); borderRadius: 3px; }`;
        listContainer.appendChild(style);
        listContainer.id = "mentor-sidebar-list";

        this.chapters.forEach(chapter => {
            const chTitle = document.createElement("div");
            chTitle.innerText = chapter.title.toUpperCase();
            Object.assign(chTitle.style, {
                fontSize: "0.75rem", fontWeight: "bold", color: "#a0aec0", marginBottom: "15px", // Lighter Gray
                paddingLeft: "10px", letterSpacing: "1px"
            });
            listContainer.appendChild(chTitle);

            chapter.modules.forEach((mod, modIdx) => {
                const item = document.createElement("button"); // Changed to button for semantics

                // Get Status
                const status = dbManager.getModuleStatus(mod.id);
                const isLocked = status === 'locked';
                const isCompleted = status === 'completed';

                // Icon
                let icon = isCompleted ? "✅" : (isLocked ? "🔒" : "📖");

                item.innerHTML = `<span style="margin-right:10px;">${icon}</span> ${mod.title}`;

                // Check active
                const isActive = (chapter === this.currentChapter) && (modIdx === this.currentModuleIndex);

                Object.assign(item.style, {
                    width: "100%", textAlign: "left",
                    padding: "12px 16px", borderRadius: "12px", marginBottom: "10px",
                    cursor: isLocked ? "not-allowed" : "pointer",
                    background: isActive ? "linear-gradient(90deg, #3182ce 0%, #2b6cb0 100%)" : "transparent",
                    color: isActive ? "white" : (isLocked ? "#718096" : "#cbd5e0"),
                    fontWeight: isActive ? "600" : "500",
                    border: "none", fontSize: "0.9rem", transition: "all 0.2s",
                    opacity: isLocked ? "0.6" : "1.0",
                    pointerEvents: isLocked ? "none" : "auto",
                    boxShadow: isActive ? "0 4px 6px rgba(0,0,0,0.2)" : "none",
                    outline: "none"
                });

                if (isLocked) {
                    item.style.filter = "grayscale(100%)"; item.style.opacity = "0.6";
                } else {
                    item.onmouseover = () => { if (!isActive) item.style.background = "rgba(255,255,255,0.05)"; };
                    item.onmouseout = () => { if (!isActive) item.style.background = "transparent"; };
                    item.onclick = () => {
                        this.currentChapter = chapter;
                        this.currentModuleIndex = modIdx;
                        this.render();
                    };
                }
                listContainer.appendChild(item);
            });
        });
        sidebar.appendChild(listContainer);

        // Bottom: Back to Home
        const homeBtn = document.createElement("button");
        homeBtn.innerHTML = "← MAIN MENU";
        Object.assign(homeBtn.style, {
            width: "100%", padding: "15px",
            marginTop: "10px", // Spacing from list
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(0,0,0,0.3)",
            borderRadius: "12px",
            cursor: "pointer",
            color: "#a0aec0",
            fontSize: "0.9rem", fontWeight: "bold",
            transition: "all 0.3s",
            flexShrink: "0" // Prevent shrinking
        });
        homeBtn.onmouseover = () => { homeBtn.style.borderColor = "white"; homeBtn.style.color = "white"; };
        homeBtn.onmouseout = () => { homeBtn.style.borderColor = "rgba(255,255,255,0.2)"; homeBtn.style.color = "#a0aec0"; };

        homeBtn.onclick = () => {
            this.container.remove();
            if (this.onNavigate) this.onNavigate("HOME");
        };
        sidebar.appendChild(homeBtn);

        this.container.appendChild(sidebar);
    }

    renderContent() {
        // Cleanup old scenes
        this.activeScenes.forEach(s => s.dispose && s.dispose());
        this.activeScenes = [];

        const module = this.currentChapter.modules[this.currentModuleIndex];
        const sections = module.sections;

        const main = document.createElement("div");
        Object.assign(main.style, {
            flex: "1", padding: "40px 60px", overflowY: "auto", position: "relative"
        });

        // Header
        const header = document.createElement("h1");
        header.innerText = module.title;
        Object.assign(header.style, { fontSize: "2.5rem", fontWeight: "800", color: "#2d3748", marginBottom: "30px", borderBottom: "2px solid #3182ce", paddingBottom: "10px", display: "inline-block" });
        main.appendChild(header);

        // --- PROGRESSION LOGIC ---
        let requiredInteractions = 0;
        let completedInteractions = 0;

        sections.forEach(sec => {
            if (sec.type === "questions") {
                requiredInteractions += sec.questions ? sec.questions.length : 0;
            } else if (sec.type === "concept_check") {
                requiredInteractions++;
            }
        });

        const checkCompletion = () => {
            if (completedInteractions >= requiredInteractions) {
                if (this.nextBtn) {
                    this.nextBtn.disabled = false;
                    this.nextBtn.style.opacity = "1";
                    this.nextBtn.style.cursor = "pointer";
                    this.nextBtn.innerText = "NEXT MODULE →";
                }
            }
        };

        // Sections Rendering
        sections.forEach(sec => {
            const block = document.createElement("div");
            block.style.marginBottom = "40px";

            switch (sec.type) {
                case "cinematic_scene":
                    const sceneWrapper = document.createElement("div");
                    Object.assign(sceneWrapper.style, {
                        width: "100%", height: "600px", background: "black",
                        borderRadius: "12px", overflow: "hidden", position: "relative", marginBottom: "40px"
                    });
                    block.appendChild(sceneWrapper);
                    const scene = new CinematicIntroScene(sceneWrapper, sec);
                    this.activeScenes.push(scene);
                    break;

                case "lab_scene":
                    const labWrapper = document.createElement("div");
                    Object.assign(labWrapper.style, {
                        width: "100%", height: "600px", background: "black",
                        borderRadius: "12px", overflow: "hidden", position: "relative", marginBottom: "40px"
                    });
                    block.appendChild(labWrapper);
                    const labScene = new LabScene(labWrapper, sec);
                    this.activeScenes.push(labScene);
                    break;

                case "explanation":
                    block.innerHTML = `
                        <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #718096; margin-bottom: 8px;">1. Formal Concept Explanation</div>
                        <p style="font-size: 1.15rem; line-height: 1.6; color: #2d3748; border-left: 4px solid #3182ce; padding-left: 16px;">${this.formatText(sec.content)}</p>
                    `;
                    break;

                case "visual_grounding":
                    let visualHtml = "";
                    if (sec.visual && sec.visual.type === "svg_scene") {
                        visualHtml = `
                            <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-bottom: 0px;">
                                ${sec.visual.content}
                                <div style="font-size: 0.85rem; color: #4a5568; font-style: italic; text-align: center; margin-top: 10px;">${sec.visual.caption}</div>
                            </div>
                        `;
                    } else if (sec.visual && sec.visual.type === "animation_scene") {
                        const framesHtml = sec.visual.frames.map(frame => `
                            <div class="frame-container">
                                <div class="frame-label">${frame.label}</div>
                                <div class="scene-stage">
                                    <div style="position: absolute; color: #cbd5e0; z-index: 1;">${frame.bg}</div>
                                    <div class="${frame.animClass}" style="position: relative; z-index: 2;">${frame.obj}</div>
                                </div>
                                <div style="font-size: 0.8rem; color: #4a5568; margin-top: 5px;">${frame.caption}</div>
                            </div>
                         `).join("");
                        visualHtml = `<div class="visual-box">${framesHtml}</div>`;
                    } else if (sec.visual && sec.visual.type === "emoji_scene") {
                        visualHtml = `
                            <div style="background: #ebf8ff; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 0px; border: 1px dashed #4299e1;">
                                <div style="font-size: 2.5rem; letter-spacing: 5px; margin-bottom: 10px; animation: float 3s ease-in-out infinite;">${sec.visual.content}</div>
                                <div style="font-size: 0.85rem; color: #4a5568; font-style: italic;">${sec.visual.caption}</div>
                            </div>
                        `;
                    }
                    block.innerHTML = `
                        <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #3182ce; margin-bottom: 8px;">2. Visual Grounding</div>
                        ${visualHtml}
                    `;
                    break;

                case "intuition_builder":
                    block.innerHTML = `
                        <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #38a169; margin-bottom: 8px;">3. Intuition Builder</div>
                        <div style="background: #f0fff4; padding: 20px; border-radius: 8px; border: 1px solid #c6f6d5;">
                             <div style="font-size: 1.05rem; color: #22543d;">${this.formatText(sec.content)}</div>
                        </div>
                    `;
                    if (sec.visual) {
                        const visualDiv = document.createElement("div");
                        visualDiv.style.marginTop = "20px";
                        if (sec.visual.type === "svg_scene") {
                            visualDiv.innerHTML = `
                                <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-bottom: 0px;">
                                    ${sec.visual.content}
                                    <div style="font-size: 0.85rem; color: #4a5568; font-style: italic; text-align: center; margin-top: 10px;">${sec.visual.caption}</div>
                                </div>
                            `;
                        }
                        block.appendChild(visualDiv);
                    }
                    break;

                case "clarification":
                    block.innerHTML = `
                        <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #dd6b20; margin-bottom: 8px;">4. Concept Clarification</div>
                        <div style="background: #fffaf0; padding: 20px; border-radius: 8px; border: 1px solid #fbd38d;">
                            <div style="font-size: 1.05rem; color: #744210;">${this.formatText(sec.content)}</div>
                        </div>
                    `;
                    break;

                case "consolidation":
                    const points = Array.isArray(sec.content) ? sec.content : [sec.content];
                    const listHtml = points.map(p => `<li style="margin-bottom: 8px;">${this.formatText(p)}</li>`).join("");
                    block.innerHTML = `
                        <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #5a67d8; margin-bottom: 8px;">5. Concept Consolidation</div>
                        <div style="background: #ebf4ff; padding: 20px; border-radius: 8px; border-left: 4px solid #5a67d8;">
                            <ul style="margin: 0; padding-left: 20px; font-size: 1.05rem; color: #2c5282;">
                                ${listHtml}
                            </ul>
                        </div>
                    `;
                    break;

                case "questions":
                    block.innerHTML = `<div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #2d3748; margin-bottom: 12px;">6. Understanding Check</div>`;
                    sec.questions.forEach((q, idx) => {
                        block.appendChild(this.createConceptCheck(q, idx, () => {
                            completedInteractions++;
                            checkCompletion();
                        }));
                    });
                    break;

                case "concept_check":
                    block.appendChild(this.createConceptCheck(sec, 0, () => {
                        completedInteractions++;
                        checkCompletion();
                    }));
                    break;

                case "thought_experiment":
                    Object.assign(block.style, { background: "#2c5282", color: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 10px 15px rgba(0,0,0,0.1)" });
                    block.innerHTML = `
                        <div style="font-weight: bold; font-size: 0.9rem; margin-bottom: 10px; color: #90cdf4; text-transform: uppercase;">⚡ Thought Experiment</div>
                        <div style="font-size: 1.1rem; font-style: italic;">"${sec.content}"</div>
                    `;
                    break;

                case "context":
                    Object.assign(block.style, { borderLeft: "4px solid #ed8936", paddingLeft: "20px" });
                    block.innerHTML = `
                        <div style="font-weight: bold; font-size: 0.9rem; margin-bottom: 5px; color: #ed8936; text-transform: uppercase;">Engineering Context</div>
                        <div style="font-size: 1.0rem; color: #4a5568;">${sec.content}</div>
                    `;
                    break;

                case "curiosity":
                    block.innerHTML = `<div style="text-align: center; color: #667eea; font-weight: bold; font-size: 1.2rem;">🤔 ${sec.content}</div>`;
                    break;
            }

            main.appendChild(block);
        });

        // Next Button
        const nextWrapper = document.createElement("div");
        nextWrapper.style.textAlign = "right";
        nextWrapper.style.marginTop = "40px";

        if (this.currentModuleIndex < this.currentChapter.modules.length - 1) {
            this.nextBtn = document.createElement("button");
            this.nextBtn.innerText = requiredInteractions > 0 ? "🔒 COMPLETE TASKS TO UNLOCK" : "NEXT MODULE →";
            Object.assign(this.nextBtn.style, {
                padding: "15px 30px", background: "#3182ce", color: "white", border: "none",
                borderRadius: "8px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer",
                boxShadow: "0 4px 6px rgba(49, 130, 206, 0.3)"
            });

            if (requiredInteractions > 0) {
                this.nextBtn.disabled = true;
                this.nextBtn.style.opacity = "0.5";
                this.nextBtn.style.cursor = "not-allowed";
            }

            this.nextBtn.onclick = () => {
                dbManager.completeModule(module.id);
                this.currentModuleIndex++;
                this.render();
            };
            nextWrapper.appendChild(this.nextBtn);
        } else {
            const finishBtn = document.createElement("button");
            const isLastChapter = this.chapters.indexOf(this.currentChapter) === this.chapters.length - 1;

            // Check current status from DB
            const isCompleted = dbManager.getModuleStatus(module.id) === 'completed';

            finishBtn.innerText = isCompleted ? "✓ COMPLETED" : (isLastChapter ? "FINISH COURSE" : "COMPLETE CHAPTER");

            // Interaction Check for Chapter End
            const canFinish = isCompleted || (requiredInteractions === 0 || completedInteractions >= requiredInteractions);

            Object.assign(finishBtn.style, {
                padding: "15px 30px",
                background: canFinish ? "#48bb78" : "#a0aec0",
                color: "white", border: "none",
                borderRadius: "8px", fontSize: "1rem", fontWeight: "bold",
                cursor: canFinish ? (isCompleted ? "default" : "pointer") : "not-allowed",
                opacity: canFinish ? "1" : "0.6",
                boxShadow: canFinish ? "0 4px 6px rgba(72, 187, 120, 0.3)" : "none"
            });

            finishBtn.disabled = !canFinish && !isCompleted;

            finishBtn.onclick = () => {
                if (isCompleted) return; // Already done

                dbManager.completeModule(module.id);
                // Re-render to update Sidebar and Button State
                this.render();
            };

            nextWrapper.appendChild(finishBtn);
        }
        main.appendChild(nextWrapper);

        this.container.appendChild(main);
    }

    createConceptCheck(data, index, onCorrect) {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, { background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", marginBottom: "20px" });

        const label = document.createElement("div");
        label.innerText = `PREDICTION CHECK ${index + 1}`;
        Object.assign(label.style, { fontSize: "0.75rem", fontWeight: "bold", color: "#a0aec0", marginBottom: "10px", letterSpacing: "1px" });
        wrapper.appendChild(label);

        const prompt = document.createElement("div");
        prompt.innerText = data.prompt;
        Object.assign(prompt.style, { fontSize: "1.1rem", fontWeight: "600", color: "#2d3748", marginBottom: "20px" });
        wrapper.appendChild(prompt);

        const optionsArea = document.createElement("div");
        optionsArea.style.display = "flex";
        optionsArea.style.flexDirection = "column";
        optionsArea.style.gap = "10px";

        const feedback = document.createElement("div");
        Object.assign(feedback.style, {
            display: "none", marginTop: "20px", padding: "15px", borderRadius: "8px", fontSize: "0.95rem", lineHeight: "1.5"
        });

        // Track if this question was already answered correctly to prevent double counting
        let solved = false;

        data.options.forEach(opt => {
            const btn = document.createElement("button");
            btn.innerText = opt.label;
            Object.assign(btn.style, {
                padding: "16px", background: "#f7fafc", color: "#4a5568", border: "2px solid #e2e8f0",
                borderRadius: "8px", fontSize: "1rem", fontWeight: "500", cursor: "pointer",
                textAlign: "left", transition: "all 0.2s", width: "100%"
            });

            btn.onmouseover = () => { if (!btn.disabled) btn.style.borderColor = "#3182ce"; };
            btn.onmouseout = () => { if (!btn.disabled) btn.style.borderColor = "#e2e8f0"; };

            btn.onclick = () => {
                // Disable all
                Array.from(optionsArea.children).forEach(b => {
                    b.disabled = true;
                    b.style.cursor = "default";
                    b.style.opacity = "0.6";
                });

                // Highlight Selected
                btn.style.opacity = "1";

                feedback.style.display = "block";

                if (opt.isCorrect) {
                    btn.style.borderColor = "#48bb78";
                    btn.style.background = "#f0fff4";
                    btn.style.color = "#276749";

                    feedback.style.background = "#f0fff4";
                    feedback.style.color = "#22543d";
                    feedback.style.border = "1px solid #c6f6d5";
                    feedback.innerHTML = `<strong style="display:block; margin-bottom:5px;">✅ Correct!</strong> ${opt.feedback}`;

                    if (!solved && onCorrect) {
                        solved = true;
                        onCorrect();
                    }
                } else {
                    btn.style.borderColor = "#f56565";
                    btn.style.background = "#fff5f5";
                    btn.style.color = "#c53030";

                    feedback.style.background = "#fff5f5";
                    feedback.style.color = "#742a2a";
                    feedback.style.border = "1px solid #fed7d7";
                    feedback.innerHTML = `<strong style="display:block; margin-bottom:5px;">❌ Not quite.</strong> ${opt.feedback}`;

                    // Add Retry Button
                    const retryBtn = document.createElement("button");
                    retryBtn.innerText = "Try Again";
                    Object.assign(retryBtn.style, {
                        marginTop: "10px", padding: "8px 16px", background: "#718096", color: "white",
                        border: "none", borderRadius: "4px", fontSize: "0.8rem", cursor: "pointer"
                    });
                    retryBtn.onclick = () => {
                        feedback.style.display = "none";
                        feedback.innerHTML = "";
                        Array.from(optionsArea.children).forEach(b => {
                            b.disabled = false;
                            b.style.cursor = "pointer";
                            b.style.opacity = "1";
                            b.style.borderColor = "#e2e8f0";
                            b.style.background = "#f7fafc";
                            b.style.color = "#4a5568";
                        });
                    };
                    feedback.appendChild(retryBtn);
                }
            };
            optionsArea.appendChild(btn);
        });

        wrapper.appendChild(optionsArea);
        wrapper.appendChild(feedback);
        return wrapper;
    }

    // Removed analyzeResponse as it's no longer needed for Prediction Checks

    formatText(text) {
        // Simple MD-like parser
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
}
