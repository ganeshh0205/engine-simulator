export const Chapter1 = {
    title: "Chapter 1: The Physics of Propulsion",
    modules: [
        {
            id: "motion",
            title: "1. Motion",
            sections: [
                {
                    type: "explanation",
                    content: "<strong>Motion</strong> is the fundamental change in an object's position relative to a specific frame of reference over time.<br><br>Detailed Analysis:<br>• **Reference Frame**: The coordinate system used to measure position.<br>• **Position**: Location of an object ($x$).<br>• <span class='si-unit'>SI Unit: Meter (m)</span>."
                },
                {
                    type: "intuition_builder",
                    content: "Motion is purely relative. To a passenger, the train is still. To an observer, it's a projectile.",
                    visual: {
                        type: "svg_scene",
                        content: `
                            <div style="display: flex; flex-direction: column; gap: 24px;">
                                <!-- Frame 1: Interior -->
                                <div style="text-align: center;">
                                    <div style="font-size: 0.75rem; font-weight: 800; color: #718096; margin-bottom: 8px;">OBSERVER: INSIDE TRAIN</div>
                                    <svg viewBox="0 0 400 120" style="width: 100%; border-radius: 12px; background: #edf2f7; overflow: hidden;">
                                        <!-- Moving Window Background (Blur) -->
                                        <g>
                                            <animateTransform attributeName="transform" type="translate" from="0 0" to="-200 0" dur="1s" repeatCount="indefinite"/>
                                            <rect x="0" y="10" width="600" height="60" fill="#bee3f8"/>
                                            <rect x="100" y="10" width="20" height="60" fill="#cbd5e0" opacity="0.5"/>
                                            <rect x="400" y="10" width="20" height="60" fill="#cbd5e0" opacity="0.5"/>
                                        </g>
                                        <!-- Interior Details -->
                                        <path d="M0,0 L400,0 L400,120 L0,120 Z" fill="none" class="frame-border" stroke="#2d3748" stroke-width="20"/>
                                        <!-- Table -->
                                        <path d="M120,80 L280,80 L280,120 L120,120 Z" fill="#2d3748"/>
                                        <!-- Realistic Cup -->
                                        <path d="M185,70 L215,70 L210,100 L190,100 Z" fill="#c05621"/>
                                        <path d="M215,75 Q225,75 225,85 Q225,95 212,95" fill="none" stroke="#c05621" stroke-width="3"/>
                                        <!-- Steam -->
                                        <path d="M195,65 Q200,55 195,45" stroke="white" stroke-width="2" fill="none" opacity="0.7">
                                            <animate attributeName="d" values="M195,65 Q200,55 195,45;M195,60 Q190,50 195,40" dur="2s" repeatCount="indefinite"/>
                                        </path>
                                        <text x="200" y="110" font-size="10" text-anchor="middle" fill="#edf2f7">v = 0</text>
                                    </svg>
                                </div>
                                <!-- Frame 2: Exterior -->
                                <div style="text-align: center;">
                                    <div style="font-size: 0.75rem; font-weight: 800; color: #718096; margin-bottom: 8px;">OBSERVER: STATION PLATFORM</div>
                                    <svg viewBox="0 0 400 120" style="width: 100%; border-radius: 12px; background: #e2e8f0; overflow: hidden;">
                                        <!-- Tracks -->
                                        <line x1="0" y1="100" x2="400" y2="100" stroke="#4a5568" stroke-width="4"/>
                                        <line x1="0" y1="105" x2="400" y2="105" stroke="#718096" stroke-width="2" stroke-dasharray="10,10"/>
                                        <!-- Train Car -->
                                        <g>
                                            <animateTransform attributeName="transform" type="translate" from="-300 0" to="500 0" dur="3s" repeatCount="indefinite"/>
                                            <!-- Body -->
                                            <path d="M20,40 L280,40 Q300,40 300,60 L300,90 L20,90 Z" fill="#4299e1"/>
                                            <rect x="50" y="50" width="200" height="20" fill="#2c5282"/>
                                            <!-- Wheels -->
                                            <circle cx="60" cy="90" r="10" fill="#2d3748"/>
                                            <circle cx="240" cy="90" r="10" fill="#2d3748"/>
                                            <!-- Speed Lines -->
                                            <path d="M10,60 L-50,60 M10,70 L-30,70" stroke="#cbd5e0" stroke-width="2" opacity="0.5"/>
                                        </g>
                                    </svg>
                                </div>
                            </div>
                        `,
                        caption: "Top: Stationary relative to you. Bottom: Moving relative to Ground."
                    }
                },
                {
                    type: "questions",
                    questions: [
                        {
                            prompt: "If you drop a ball inside a moving car, where does it land relative to you?",
                            options: [
                                { label: "Behind me", isCorrect: false, feedback: "Only if the car accelerates!" },
                                { label: "Straight down", isCorrect: true, feedback: "Correct. You share the same forward velocity." }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "speed_time",
            title: "2. Speed & Time",
            sections: [
                {
                    type: "explanation",
                    content: "<strong>Speed</strong> is a scalar quantity measuring the rate of distance coverage.<br><br><div class='math-eqn'>Speed = <div class='fraction'><span class='numerator'>Distance</span><span class='denominator'>Time</span></div></div><br>• <strong>Scalar</strong>: Magnitude only.<br>• <span class='si-unit'>SI Unit: Meters per second (m/s)</span>.<br>• <strong>Dimensional Analysis</strong>: $[L][T]^{-1}$"
                },
                {
                    type: "intuition_builder",
                    content: "Detailed shapes matter. Here, speed is visualized as the ability to traverse space in less time.",
                    visual: {
                        type: "svg_scene",
                        content: `
                            <div style="display: flex; flex-direction: column; gap: 20px;">
                                <!-- Slow Car -->
                                <div style="position: relative; height: 60px; background: #edf2f7; border-radius: 6px; overflow: hidden;">
                                    <div style="position: absolute; top: 40px; left: 0; width: 100%; height: 2px; background: #cbd5e0;"></div>
                                    <svg width="100%" height="30" viewBox="0 0 300 30" style="position: absolute; top: 15px;">
                                        <!-- Moving Car using translate -->
                                        <g>
                                            <animateTransform attributeName="transform" type="translate" from="0 0" to="240 0" dur="4s" repeatCount="indefinite"/>
                                            <!-- Realistic Sedan Body -->
                                            <path d="M0,20 L60,20 L55,10 L40,5 L15,5 L5,10 Z" fill="#4299e1"/>
                                            <circle cx="15" cy="20" r="5" fill="#2d3748"/>
                                            <circle cx="45" cy="20" r="5" fill="#2d3748"/>
                                            <text x="30" y="15" font-size="6" fill="white" text-anchor="middle">50mph</text>
                                        </g>
                                    </svg>
                                </div>
                                <!-- Fast Car -->
                                <div style="position: relative; height: 60px; background: #edf2f7; border-radius: 6px; overflow: hidden;">
                                    <div style="position: absolute; top: 40px; left: 0; width: 100%; height: 2px; background: #cbd5e0;"></div>
                                    <svg width="100%" height="30" viewBox="0 0 300 30" style="position: absolute; top: 15px;">
                                        <!-- Moving Car FASTER -->
                                        <g>
                                            <animateTransform attributeName="transform" type="translate" from="0 0" to="240 0" dur="1.5s" repeatCount="indefinite"/>
                                            <!-- Realistic Sports Car Body -->
                                            <path d="M0,20 L60,20 L60,15 L50,5 L20,5 L0,15 Z" fill="#e53e3e"/>
                                            <polygon points="5,15 15,15 20,5 50,5 55,15 60,15 60,20 0,20" fill="#c53030"/>
                                            <circle cx="15" cy="20" r="5" fill="#2d3748"/>
                                            <circle cx="45" cy="20" r="5" fill="#2d3748"/>
                                            <!-- Spoiler -->
                                            <rect x="0" y="10" width="5" height="5" fill="#c53030"/>
                                            <text x="30" y="15" font-size="6" fill="white" text-anchor="middle">150mph</text>
                                        </g>
                                    </svg>
                                </div>
                            </div>
                        `,
                        caption: "High Speed = Small Time Denominator."
                    }
                },
                {
                    type: "questions",
                    questions: [
                        {
                            prompt: "If distance is constant, how are Speed and Time related?",
                            options: [
                                { label: "Inversely", isCorrect: true, feedback: "Correct. $t = d/v$. More speed = Less time." },
                                { label: "Directly", isCorrect: false, feedback: "No. That would mean faster cars take longer." }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "velocity",
            title: "3. Direction & Velocity",
            sections: [
                {
                    type: "explanation",
                    content: "<strong>Velocity</strong> is a Vector (Magnitude + Direction).<br><br><div class='math-eqn'>Velocity = <div class='fraction'><span class='numerator'>Displacement</span><span class='denominator'>Time</span></div></div><br>• <span class='si-unit'>SI Unit: m/s (Vector)</span>.<br>• <strong>Key Concept</strong>: Turning at constant speed IS acceleration."
                },
                {
                    type: "intuition_builder",
                    content: "Notice the blue arrow. Even though the car's speed is steady, the arrow rotates. That rotation represents a change in velocity.",
                    visual: {
                        type: "svg_scene",
                        content: `
                            <div style="text-align: center; background: #2d3748; padding: 20px; border-radius: 12px;">
                                <svg viewBox="0 0 200 200" style="width: 180px;">
                                    <!-- Track -->
                                    <circle cx="100" cy="100" r="80" stroke="#718096" stroke-width="2" fill="none" stroke-dasharray="10,5"/>
                                    <g>
                                        <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="5s" repeatCount="indefinite" ease="linear"/>
                                        <!-- Car Body (Top Down) -->
                                        <rect x="95" y="12" width="10" height="16" fill="#f56565" rx="2"/>
                                        <!-- Velocity Vector -->
                                        <line x1="100" y1="20" x2="160" y2="20" stroke="#63b3ed" stroke-width="4" marker-end="url(#vArrow)"/>
                                    </g>
                                    <defs>
                                        <marker id="vArrow" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
                                            <polygon points="0 0, 6 2, 0 4" fill="#63b3ed" />
                                        </marker>
                                    </defs>
                                    <text x="100" y="105" font-size="12" fill="white" text-anchor="middle">Vector Changes</text>
                                </svg>
                            </div>
                        `,
                        caption: "Velocity is an Arrow. If the Arrow turns, Velocity changes."
                    }
                },
                {
                    type: "questions",
                    questions: [
                        {
                            prompt: "Is a car turning a corner at 20 mph accelerating?",
                            options: [
                                { label: "Yes", isCorrect: true, feedback: "Correct. Velocity vector is changing direction." },
                                { label: "No", isCorrect: false, feedback: "Incorrect. Speed is constant, but Velocity is not." }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "types_motion",
            title: "4. Types of Motion",
            sections: [
                {
                    type: "explanation",
                    content: "Mechanical systems use complex motion types.<br>1. **Linear**: Translation.<br>2. **Rotary**: Rotation.<br>3. **Reciprocating**: Linear back-and-forth."
                },
                {
                    type: "intuition_builder",
                    content: "Pistons (Reciprocating) drive Wheels (Rotary) to create Vehicle motion (Linear).",
                    visual: {
                        type: "svg_scene",
                        content: `
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <!-- Linear -->
                                <div style="background: #f7fafc; padding: 10px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.7rem; color: #718096; margin-bottom: 5px;">LINEAR</div>
                                    <svg viewBox="0 0 100 50">
                                        <line x1="10" y1="25" x2="90" y2="25" stroke="#cbd5e0" stroke-width="2"/>
                                        <circle cx="10" cy="25" r="8" fill="#4299e1">
                                            <animate attributeName="cx" values="10;90;10" dur="2s" repeatCount="indefinite"/>
                                        </circle>
                                    </svg>
                                </div>
                                <!-- Rotary -->
                                <div style="background: #f7fafc; padding: 10px; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 0.7rem; color: #718096; margin-bottom: 5px;">ROTARY</div>
                                    <svg viewBox="0 0 100 50">
                                        <g transform="translate(50,25)">
                                            <!-- Spinning Gear Group -->
                                            <g>
                                                <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="3s" repeatCount="indefinite"/>
                                                <circle r="15" fill="#f56565"/>
                                                <rect x="-4" y="-20" width="8" height="40" fill="#f56565"/>
                                                <rect x="-20" y="-4" width="40" height="8" fill="#f56565"/>
                                                <circle r="5" fill="white"/>
                                            </g>
                                        </g>
                                    </svg>
                                </div>
                                <!-- Reciprocating -->
                                <div style="background: #f7fafc; padding: 10px; border-radius: 8px; text-align: center; grid-column: span 2;">
                                    <div style="font-size: 0.7rem; color: #718096; margin-bottom: 5px;">RECIPROCATING (PISTON & CRANK)</div>
                                    <svg viewBox="0 0 200 80">
                                        <!-- Cylinder -->
                                        <rect x="20" y="20" width="80" height="40" stroke="#4a5568" fill="none" stroke-width="2"/>
                                        
                                        <!-- Animated Mechanism Group -->
                                        <g>
                                            <!-- We simulate the motion using a translation group for the piston -->
                                            <!-- Piston Head Motion: Harmonic approximation -->
                                            <rect x="25" y="22" width="20" height="36" fill="#48bb78" rx="2">
                                                <animate attributeName="x" values="25; 75; 25" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
                                            </rect>
                                            
                                            <!-- Connecting Rod and Crank -->
                                            <!-- This is complex to do perfectly with just SMIL in one go, so we use a visual approximation -->
                                            <!-- Crank Wheel -->
                                            <circle cx="150" cy="40" r="15" stroke="#a0aec0" fill="none" stroke-width="2"/>
                                            
                                            <!-- Crank Pin & Rod -->
                                            <!-- We use a path that morphs or just a stick that moves back and forth with the piston -->
                                            <line x1="45" y1="40" x2="135" y2="40" stroke="#a0aec0" stroke-width="4">
                                                <animate attributeName="x1" values="45; 95; 45" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
                                                <animate attributeName="x2" values="135; 165; 135" dur="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"/>
                                            </line>
                                        </g>
                                    </svg>
                                </div>
                            </div>
                        `,
                        caption: "Reciprocating Motion: Back and Forth."
                    }
                },
                {
                    type: "questions",
                    questions: [
                        {
                            prompt: "A turbine spinning on a shaft is example of...",
                            options: [
                                { label: "Rotary Motion", isCorrect: true, feedback: "Correct." },
                                { label: "Linear Motion", isCorrect: false, feedback: "No, it stays in place and spins." }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "mass_inertia",
            title: "5. Mass & Resistance",
            sections: [
                {
                    type: "explanation",
                    content: "<strong>Mass ($m$)</strong> is the quantitative measure of Inertia. It is NOT Weight.<br><br>• <span class='si-unit'>SI Unit: Kilogram (kg)</span>.<br>• Weight = $m \times g$. Mass is constant."
                },
                {
                    type: "intuition_builder",
                    content: "In Zero Gravity, a 1000kg block has no weight, but it still has 1000kg of Mass. It is incredibly hard to push.",
                    visual: {
                        type: "svg_scene",
                        content: `
                            <div style="display: flex; justify-content: space-around; background: #1a202c; padding: 20px; border-radius: 12px; align-items: center;">
                                <div style="text-align: center;">
                                    <svg width="60" height="60">
                                        <circle cx="30" cy="30" r="15" fill="#bee3f8" stroke="white" stroke-width="1">
                                             <animate attributeName="cx" values="30;35;30;25;30" dur="0.2s" repeatCount="indefinite" begin="mouseover"/> 
                                        </circle>
                                        <text x="30" y="34" font-size="10" fill="#2d3748" text-anchor="middle" font-weight="bold">1kg</text>
                                    </svg>
                                    <div style="color: #a0aec0; font-size: 0.7rem;">Easy to Shake</div>
                                </div>
                                <div style="text-align: center;">
                                    <svg width="80" height="80">
                                        <!-- Cargo Container Shape -->
                                        <rect x="10" y="20" width="60" height="40" fill="#2b6cb0" stroke="white" stroke-width="2">
                                            <animate attributeName="x" values="10;11;10" dur="2s" repeatCount="indefinite"/> 
                                        </rect>
                                        <line x1="20" y1="20" x2="20" y2="60" stroke="#4299e1"/>
                                        <line x1="30" y1="20" x2="30" y2="60" stroke="#4299e1"/>
                                        <line x1="40" y1="20" x2="40" y2="60" stroke="#4299e1"/>
                                        <line x1="50" y1="20" x2="50" y2="60" stroke="#4299e1"/>
                                        <line x1="60" y1="20" x2="60" y2="60" stroke="#4299e1"/>
                                        <text x="40" y="45" font-size="8" fill="white" text-anchor="middle" font-weight="bold">1000kg</text>
                                    </svg>
                                    <div style="color: #a0aec0; font-size: 0.7rem;">Hard to Move</div>
                                </div>
                            </div>
                        `,
                        caption: "Mass is Resistance to Acceleration."
                    }
                },
                {
                    type: "questions",
                    questions: [
                        {
                            prompt: "Which is harder to stop in space: A slow 1kg rock or a slow 1000kg rock?",
                            options: [
                                { label: "1000kg rock", isCorrect: true, feedback: "Correct. More Mass = More Inertia." },
                                { label: "Same", isCorrect: false, feedback: "No. Mass determines resistance." }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "momentum",
            title: "6. Momentum",
            sections: [
                {
                    type: "explanation",
                    content: "<strong>Momentum ($p$)</strong> is mass in motion.<br><br><div class='math-eqn'>$p$ = $m$ $\\times$ $v$</div><br>• <span class='si-unit'>SI Unit: kg·m/s</span>."
                },
                {
                    type: "intuition_builder",
                    content: "A semi-truck at 5mph creates more damage than a bike at 20mph. Mass dominates momentum.",
                    visual: {
                        type: "svg_scene",
                        content: `
                            <div style="background: white; border-radius: 12px; padding: 10px; border: 1px solid #e2e8f0;">
                                <!-- Truck -->
                                <div style="margin-bottom: 20px;">
                                    <div style="font-size: 0.7rem; margin-bottom: 5px;">TRUCK (Big Mass, Slow)</div>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <svg width="60" height="40">
                                            <g>
                                                <animateTransform attributeName="transform" type="translate" from="0 0" to="5 0" dur="2s" repeatCount="indefinite"/>
                                                <path d="M0,10 L40,10 L40,25 L55,25 L55,35 L0,35 Z" fill="#2d3748"/>
                                                <circle cx="10" cy="35" r="4" fill="#718096"/>
                                                <circle cx="35" cy="35" r="4" fill="#718096"/>
                                                <circle cx="50" cy="35" r="4" fill="#718096"/>
                                            </g>
                                        </svg>
                                        <div style="height: 10px; width: 150px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                            <div style="height: 100%; width: 90%; background: #e53e3e;"></div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Bullet -->
                                <div>
                                    <div style="font-size: 0.7rem; margin-bottom: 5px;">BULLET (Tiny Mass, Fast)</div>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <svg width="60" height="20">
                                             <g>
                                                <animateTransform attributeName="transform" type="translate" from="0 0" to="40 0" dur="0.5s" repeatCount="indefinite"/>
                                                <path d="M0,8 L10,8 Q15,10 10,12 L0,12 Z" fill="#a0aec0"/>
                                                <line x1="15" y1="10" x2="40" y2="10" stroke="#cbd5e0" stroke-width="1" stroke-dasharray="2,2"/>
                                            </g>
                                        </svg>
                                        <div style="height: 10px; width: 150px; background: #e2e8f0; border-radius: 5px; overflow: hidden;">
                                            <div style="height: 100%; width: 90%; background: #e53e3e;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `,
                        caption: "Momentum = Mass × Velocity."
                    }
                },
                {
                    type: "questions",
                    questions: [
                        {
                            prompt: "If a ping-pong ball hits you at 100 mph vs a bowling ball at 1 mph...",
                            options: [
                                { label: "Bowling Ball hurts more", isCorrect: true, feedback: "Correct. Its massive mass gives it huge momentum." },
                                { label: "Ping Pong Ball", isCorrect: false, feedback: "Too light. Not enough momentum." }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "force",
            title: "7. Force",
            sections: [
                {
                    type: "explanation",
                    content: "<strong>Force ($F$)</strong> causes acceleration.<br><br><div class='math-eqn'>$F$ = $m$ $\\times$ $a$</div><br>• <span class='si-unit'>SI Unit: Newton (N)</span>."
                },
                {
                    type: "intuition_builder",
                    content: "If you push partially, nothing happens. If you push hard enough (Net Force > 0), acceleration occurs.",
                    visual: {
                        type: "svg_scene",
                        content: `
                            <div style="background: white; border: 1px solid #48bb78; padding: 10px; border-radius: 8px;">
                                <div style="font-size: 0.7rem; color: #2f855a; text-align:center; padding-bottom:5px;">UNBALANCED FORCE</div>
                                <svg viewBox="0 0 200 40">
                                    <g>
                                        <animateTransform attributeName="transform" type="translate" values="0,0; 80,0" dur="2s" repeatCount="indefinite" fill="freeze"/>
                                        <rect x="50" y="10" width="20" height="20" fill="#2d3748"/>
                                        <path d="M70,20 L120,20" stroke="#48bb78" stroke-width="4" marker-end="url(#arrowBig)"/>
                                    </g>
                                    <defs>
                                        <marker id="arrowBig" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto"><polygon points="0 0, 6 2, 0 4" fill="#48bb78"/></marker>
                                    </defs>
                                </svg>
                            </div>
                        `,
                        caption: "Net Force causes change in velocity."
                    }
                },
                {
                    type: "questions",
                    questions: [
                        {
                            prompt: "Can an object move if Net Force is zero?",
                            options: [
                                { label: "Yes", isCorrect: true, feedback: "Correct. It can move at constant velocity (Newton's 1st Law)." },
                                { label: "No", isCorrect: false, feedback: "Incorrect. It just can't *accelerate*." }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "continuous_flow",
            title: "8. Continuous Flow",
            sections: [
                {
                    type: "explanation",
                    content: "In Propulsion, we deal with fluids (Air). Mass becomes <strong>Mass Flow Rate</strong>.<br><br><div class='math-eqn'>$\\dot{m}$ = <div class='fraction'><span class='numerator'>Mass ($kg$)</span><span class='denominator'>Time ($s$)</span></div></div><br>• <span class='si-unit'>SI Unit: kg/s</span>."
                },
                {
                    type: "intuition_builder",
                    content: "Think of a firehose. The 'Kicks' come from the *rate* of water leaving. 100 gallons per minute > 1 gallon per minute.",
                    visual: {
                        type: "svg_scene",
                        content: `
                            <div style="background: #2d3748; padding: 20px; border-radius: 12px; text-align: center;">
                                <svg viewBox="0 0 200 60" style="overflow: visible;">
                                    <path d="M0,15 L180,15 M0,45 L180,45" stroke="#a0aec0" stroke-width="2"/>
                                    <g fill="#63b3ed">
                                        <circle r="3"><animate attributeName="cx" from="0" to="200" dur="1s" repeatCount="indefinite"/><animate attributeName="cy" values="25;35;25" dur="1s" repeatCount="indefinite"/></circle>
                                        <circle r="3"><animate attributeName="cx" from="10" to="210" dur="1s" repeatCount="indefinite"/><animate attributeName="cy" values="30;20;30" dur="1s" repeatCount="indefinite"/></circle>
                                        <circle r="3"><animate attributeName="cx" from="20" to="220" dur="1s" repeatCount="indefinite"/><animate attributeName="cy" values="35;25;35" dur="1s" repeatCount="indefinite"/></circle>
                                        <circle r="3"><animate attributeName="cx" from="30" to="230" dur="1s" repeatCount="indefinite"/><animate attributeName="cy" values="40;20;40" dur="1s" repeatCount="indefinite"/></circle>
                                    </g>
                                    <text x="100" y="55" font-size="8" fill="white" text-anchor="middle">Flow Rate ($\dot{m}$)</text>
                                </svg>
                            </div>
                        `,
                        caption: "Continuous Flow = Constant Stream of Mass."
                    }
                },
                {
                    type: "questions",
                    questions: [
                        {
                            prompt: "If you constrict a hose, water speeds up. Why?",
                            options: [
                                { label: "Conservation of Mass", isCorrect: true, feedback: "Correct. Same mass must pass through smaller area, so it moves faster." },
                                { label: "Magic", isCorrect: false, feedback: "Physics!" }
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "thrust",
            title: "9. Thrust",
            sections: [
                {
                    type: "explanation",
                    content: "<strong>Thrust</strong> is reaction force.<br><br><div class='math-eqn'>$F_{thrust}$ = $\\dot{m}$ $\\times$ $v_{exit}$</div><br>• <span class='si-unit'>SI Unit: Newton (N)</span>."
                },
                {
                    type: "intuition_builder",
                    content: "Action: Throw Mass Back. Reaction: Go Forward. This is how all rockets work.",
                    visual: {
                        type: "svg_scene",
                        content: `
                            <div style="background: #1a202c; padding: 20px; border-radius: 12px; text-align: center;">
                                <svg viewBox="0 0 200 80">
                                    <!-- Rocket Group -->
                                    <g>
                                        <animateTransform attributeName="transform" type="translate" values="0,0; -2,0; 2,0; 0,0" dur="0.2s" repeatCount="indefinite"/>
                                        <!-- Rocket Body -->
                                        <path d="M80,30 L140,30 L140,50 L80,50 L60,40 Z" fill="#e2e8f0"/>
                                        <!-- Nozzle -->
                                        <path d="M140,35 L150,30 L150,50 L140,45 Z" fill="#a0aec0"/>
                                    </g>
                                    
                                    <!-- Exhaust Plume -->
                                    <g transform="translate(150, 40)">
                                        <circle r="5" fill="#f6ad55" opacity="0.8">
                                            <animate attributeName="cx" from="0" to="50" dur="0.5s" repeatCount="indefinite"/>
                                            <animate attributeName="r" values="5; 10; 0" dur="0.5s" repeatCount="indefinite"/>
                                            <animate attributeName="opacity" values="0.8; 0" dur="0.5s" repeatCount="indefinite"/>
                                        </circle>
                                        <circle r="4" fill="#f6ad55" opacity="0.8">
                                            <animate attributeName="cx" from="0" to="50" dur="0.5s" begin="0.1s" repeatCount="indefinite"/>
                                            <animate attributeName="r" values="4; 8; 0" dur="0.5s" repeatCount="indefinite"/>
                                            <animate attributeName="opacity" values="0.8; 0" dur="0.5s" repeatCount="indefinite"/>
                                        </circle>
                                    </g>
                                    
                                    <!-- Reaction Arrow -->
                                    <path d="M100,60 L70,60" stroke="#48bb78" stroke-width="2" marker-end="url(#arrowBig)"/>
                                    <text x="85" y="75" font-size="8" fill="#48bb78" text-anchor="middle">Reaction</text>
                                </svg>
                            </div>
                        `,
                        caption: "Action (Exhaust) = Reaction (Thrust)."
                    }
                },
                {
                    type: "questions",
                    questions: [
                        {
                            prompt: "Does a rocket push against the atmosphere?",
                            options: [
                                { label: "No", isCorrect: true, feedback: "Correct. It pushes the gas away, which pushes the rocket back." },
                                { label: "Yes", isCorrect: false, feedback: "Incorrect. Rockets work better in space (vacuum)!" }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};
