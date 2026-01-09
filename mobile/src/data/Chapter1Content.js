export const Chapter1 = {
    title: "Chapter 1: The Physics of Propulsion",
    modules: [
        {
            id: "motion",
            title: "1. Motion",
            sections: [
                {
                    type: "explanation",
                    content: "<strong>Motion</strong> is the fundamental change in an object's position relative to a specific frame of reference over time.<br><br>Detailed Analysis:<br>• **Reference Frame**: The coordinate system used to measure position.<br>• **Position**: Location of an object.<br>"
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
        // ... (We will add more modules if needed, keeping it light for now to save space, but the structure is there)
    ]
};
