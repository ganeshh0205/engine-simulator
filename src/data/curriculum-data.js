export const CURRICULUM = [
    {
        id: "c1",
        title: "Phase 1: Foundations of Propulsion",
        goal: "Master the fundamental laws from Motion to Thrust.",
        modules: [
            {
                id: "m0",
                title: "The Nature of Motion",
                goal: "Define Movement accurately.",
                nodes: {
                    "start": {
                        visual: "motion-all",
                        text: "## WHAT IS MOTION?\n\nBefore we build engines, we must define what we are trying to create: **Motion**.\n\nMotion is simply a change in position over time. It comes in three flavors for engineers:\n1. **Linear**: Straight line (Rocket launch).\n2. **Rotational**: Spinning (Turbine shaft).\n3. **Oscillating**: Vibration (Piston engine).\n\nPropulsion starts as Linear, often created by Rotational machinery.",
                        next: "q1"
                    },
                    "q1": {
                        visual: "motion-oscillating",
                        text: "## CHALLENGE\n\nInside a car engine, a piston moves Up and Down constantly. It never leaves the engine block.\n\nIs the piston in **Motion**?",
                        choices: [
                            { label: "No, it isn't going anywhere.", isCorrect: false, feedback: "Incorrect. It is changing position relative to the cylinder.", next: null },
                            { label: "Yes, it is Oscillating Motion.", isCorrect: true, feedback: "Correct. Even though it stays in the car, its position changes over time. This is Oscillation.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m1",
                title: "Speed vs Velocity",
                goal: "Scalars vs Vectors.",
                nodes: {
                    "start": {
                        visual: "velocity-circle",
                        text: "## DIRECTION MATTERS\n\nIn standard English, 'Speed' and 'Velocity' are synonyms. In Engineering, they are opposites.\n\n**Speed** is a Scalar (Magnitude only): '100 km/h'.\n**Velocity** is a Vector (Magnitude + Direction): '100 km/h North'.\n\nWhy does this matter? Because changing Direction requires Force, even if Speed stays the same.",
                        next: "lab"
                    },
                    "lab": {
                        visual: "velocity-interactive",
                        text: "## LAB: STEERING VECTORS\n\nYou are driving a car at constant speed. However, you can change your **Velocity Vector** by steering.\n\n**Instructions**:\n1. Use the **Steering** slider to turn.\n2. Watch the **Red Arrow** (Velocity).\n3. Even if speed is constant, the Vector changes.",
                        controls: [
                            { id: "steering", label: "Steer L/R", min: -50, max: 50, default: 0 }
                        ],
                        next: "q1"
                    },
                    "q1": {
                        visual: "velocity-circle",
                        text: "## CHALLENGE\n\nA car drives in a perfect circle at a constant 50 km/h.\n\nIs the **Velocity** constant?",
                        choices: [
                            { label: "Yes, it stays at 50 km/h.", isCorrect: false, feedback: "That is Speed, not Velocity.", next: null },
                            { label: "No, the Direction is changing.", isCorrect: true, feedback: "Correct. Velocity = Speed + Direction. If Direction changes, Velocity changes.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m2",
                title: "The Nature of Force",
                goal: "Net Force.",
                nodes: {
                    "start": {
                        visual: "force-balanced",
                        text: "## WHAT IS A FORCE?\n\nA Force is a push or a pull. But here is the secret: **Only Unbalanced Forces matter.**\n\nIf I push a block Left with 10N, and you push it Right with 10N, the Net Force is 0. The physics engine sees Zero. Nothing happens.\n\nMotion changes ONLY when forces are unbalanced.",
                        next: "lab"
                    },
                    "lab": {
                        visual: "force-interactive",
                        text: "## LAB: BALANCING FORCES\n\nWelcome to the Simulator. You have control over **Thrust** (Green) and **Drag** (Red).\n\n**Goal**: Achieve a steady, constant velocity.\n\n**Instructions**:\n1. Increase Thrust to start moving.\n2. Notice how Speed climbs (Acceleration).\n3. Match Drag to equal Thrust.\n4. Watch what happens to Speed.",
                        controls: [
                            { id: "thrust", label: "Thrust", min: 0, max: 200, default: 50 },
                            { id: "drag", label: "Drag", min: 0, max: 200, default: 50 }
                        ],
                        next: "q1"
                    },
                    "q1": {
                        visual: "force-plane-equilibrium",
                        text: "## CHALLENGE\n\nAn airplane flies at constant velocity. The Engines push Forward (Thrust). The Air pushes Back (Drag).\n\nWhich force is stronger?",
                        choices: [
                            { label: "Thrust is stronger.", isCorrect: false, feedback: "If Thrust > Drag, the plane would Accumulate Speed (Accelerate). It's constant.", next: null },
                            { label: "They are exactly equal.", isCorrect: true, feedback: "Correct. F_net = 0. The plane is in Equilibrium (Newton's 1st Law).", next: null }
                        ]
                    }
                }
            },
            {
                id: "m3",
                title: "Mass & Inertia",
                goal: "Resistance to Change.",
                nodes: {
                    "start": {
                        visual: "ice-sliding",
                        text: "## MASS IS RESISTANCE\n\nWhat is Mass? It isn't just 'weight'. In Space, you are weightless, but you still have Mass.\n\nMass is **Inertia**. It is the property that says 'I hate changing speed'.\n\nWatch the Hand push the Block. The Block resists the start (Inertia at rest). Then, when the hand stops, the Block resists stopping (Inertia in motion).",
                        next: "q1"
                    },
                    "q1": {
                        visual: "mass-comparison",
                        text: "## CHALLENGE\n\nWhy is it harder to stop a freight train than a bicycle, even if both move at 1 km/h?",
                        choices: [
                            { label: "The train is bigger.", isCorrect: false, feedback: "Size implies volume. It's about Mass.", next: null },
                            { label: "The train has more Inertia.", isCorrect: true, feedback: "Correct. The train has more Mass, so it has more 'Resistance to Stopping'.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m4",
                title: "Momentum",
                goal: "Mass in Motion.",
                nodes: {
                    "start": {
                        visual: "ice-sliding",
                        text: "## MOMENTUM EXCHANGE\n\n**Momentum ($p = mv$)** is a quantity that is always Conserved. You cannot create or destroy it.\n\nTo move Forward (+p), you MUST push something Backward (-p).\n\n*   **Car**: Pushes Earth backward (Tires).\n*   **Swimmer**: Pushes Water backward.\n*   **Rocket**: Pushes Gas backward.\n\nPropulsion is simply the business of managing this exchange.",
                        next: "q1"
                    },
                    "q1": {
                        visual: "reaction-ice-throw",
                        text: "## CHALLENGE\n\nIf the Ice Skater throws a heavy ball, she moves back. If she throws a feather equally fast, she barely moves. Why?",
                        choices: [
                            { label: "The feather has no air resistance.", isCorrect: false, feedback: "No.", next: null },
                            { label: "The feather has little Mass.", isCorrect: true, feedback: "Correct. Low Mass * Velocity = Low Momentum. She only gains the momentum she threw equal and opposite.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m5",
                title: "The Fluid World",
                goal: "Air is Heavy.",
                nodes: {
                    "start": {
                        visual: "fluid-laminar",
                        text: "## AIR IS A RIVER\n\nEngines don't work in a void (usually). They work in Air. \n\nAir is a **Fluid**. It flows like water. It has:\n1. **Viscosity** (Thickness).\n2. **Density** (Weight).\n\nSee the streamlines? We want smooth (Laminar) flow. Chaos (Turbulence) is wasted energy.",
                        next: "q1"
                    },
                    "q1": {
                        visual: "fluid-turbulent",
                        text: "## CHALLENGE\n\nWhy are airplanes streamlined (smooth shaped)?",
                        choices: [
                            { label: "To look fast.", isCorrect: false, feedback: "No.", next: null },
                            { label: "To keep the air flow smooth.", isCorrect: true, feedback: "Correct. Smooth flow = Low Drag. Turbulent flow (swirling) sucks energy from the plane.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m6",
                title: "Thrust",
                goal: "The Result.",
                nodes: {
                    "start": {
                        visual: "reaction-rocket",
                        text: "## THRUST FORMULA\n\nNewton said $F=ma$. But for engines, we don't accelerate a solid block once. We accelerate gas **continuously**.\n\nSo we use the **Propulsion Equation**:\n\n$$F = \\dot{m} \\times v_e$$\n\n*   **$\\dot{m}$ (m-dot)**: Mass Flow Rate (kg/s). How much air/fuel we push.\n*   **$v_e$**: Exhaust Velocity (m/s). How fast we throw it.\n\nThrust depends on throwing **Heavy** things OR throwing things **Fast**.",
                        next: "q1"
                    },
                    "q1": {
                        visual: "reaction-rocket",
                        text: "## CHALLENGE\n\nWhich engine covers MORE distance for the same fuel?\nA. One that pushes a small mass VERY fast.\nB. One that pushes a huge mass VERY slowly.",
                        choices: [
                            { label: "A (Small Mass, Fast)", isCorrect: false, feedback: "Fast exhaust is energetic but efficient? Not always for slow travel.", next: null },
                            { label: "B (Huge Mass, Slow)", isCorrect: true, feedback: "Correct (for low speeds). Moving lots of air slowly (Propeller) is efficient. Moving little air fast (Rocket) is wasteful but powerful.", next: null }
                        ]
                    }
                }
            }
        ]
    },
    {
        id: "c2",
        title: "Phase 2: Introduction to Propulsion",
        goal: "Understand the Purpose, Principle, and Context of Propulsion.",
        modules: [
            {
                id: "m7",
                title: "What is Propulsion?",
                goal: "Define propulsion correctly.",
                nodes: {
                    "start": {
                        visual: "space-coasting",
                        text: "## CONCEPT: DEFINING PROPULSION\n\nPropulsion is NOT 'movement'. An asteroid moves without propulsion. \n\nPropulsion is the act of **changing the momentum state** of a vehicle. It is required to:\n1. Accelerate (Start)\n2. Decelerate (Stop)\n3. Turn (Change Vector)\n4. Oppose Resistance (Drag)\n\nIf you are Coasting in a vacuum, you have Motion, but you are not 'Propelling'.",
                        next: "q1"
                    },
                    "q1": {
                        visual: "space-thrust",
                        text: "## CHALLENGE\n\nA spaceship engine fires for 10 minutes, accelerating the ship to 0.5c (half light speed). Then it shuts off.\n\nIs the ship 'Propelling' while coasting at 0.5c?",
                        choices: [
                            { label: "Yes, because it is moving incredibly fast.", isCorrect: false, feedback: "Speed is irrelevant. No active force = No propulsion.", next: null },
                            { label: "No.", isCorrect: true, feedback: "Correct. It is in a state of high Inertial Moment, but the Propulsion event has ended.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m8",
                title: "Why is it Necessary?",
                goal: "Resistance & Control.",
                nodes: {
                    "start": {
                        visual: "space-drag",
                        text: "## CONCEPT: THE BATTLE AGAINST LOSSES\n\nOn Earth, we need propulsion constantly. Why? Because we live in a 'Lossy' environment.\n\n1. **Drag**: Air smashes into the vehicle, stealing momentum.\n2. **Friction**: The ground rubs against wheels, stealing momentum.\n3. **Gravity**: Pulls us down.\n\nPropulsion on Earth is mostly about **Replenishing Lost Momentum**.",
                        next: "q1"
                    },
                    "q1": {
                        visual: "friction-car-drag",
                        text: "## CHALLENGE\n\nA car is driving at a constant 100 km/h on a flat road. The engine is working hard.\n\nSince the speed is constant (Acceleration = 0), why is Force required?",
                        choices: [
                            { label: "To increase momentum.", isCorrect: false, feedback: "Momentum is constant. We aren't increasing it.", next: null },
                            { label: "To cancel out Drag and Friction.", isCorrect: true, feedback: "Correct. F_net = 0. But F_drag is negative. So F_engine must be positive to balance it.", next: null },
                            { label: "To keep the fuel burning.", isCorrect: false, feedback: "Circular logic.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m9",
                title: "How it Works",
                goal: "The Fundamental Principle.",
                nodes: {
                    "start": {
                        visual: "reaction-rocket",
                        text: "## CONCEPT: MOMENTUM EXCHANGE\n\nHow do you move without anything to push against? You can't. You ALWAYS need something to push.\n\nIn Propulsion, we carry 'stuff' (Reaction Mass) just to throw it away. \n\n**The Principle**: If I throw a 1kg ball backward at 10 m/s, I gain 10 units of forward momentum. \n\nThis is Newton's 3rd Law: **Action = -Reaction**.",
                        next: "q1"
                    },
                    "q1": {
                        visual: "reaction-rocket",
                        text: "## CHALLENGE\n\nA rocket in deep space has no atmosphere to push against. It fires its engine. What physically pushes the rocket forward?",
                        choices: [
                            { label: "The pressure of the exhaust against the void.", isCorrect: false, feedback: "The void has no pressure to push back.", next: null },
                            { label: "The exhaust gas pushing against the rocket bell.", isCorrect: true, feedback: "Correct. The gas explodes, pushing the rocket FORWARD as it escapes BACKWARD.", next: null },
                            { label: "Gravity assists.", isCorrect: false, feedback: "No.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m10",
                title: "Types of Propulsion",
                goal: "Interaction vs Reaction.",
                nodes: {
                    "start": {
                        visual: "types-comparison",
                        text: "## CONCEPT: TWO WAYS TO PUSH\n\n1. **Interaction (Air-Breathing)**: You grab the air around you and throw it back. (e.g. Propellers, Jets). Advantage: You don't perform to carry the air.\n\n2. **Reaction (Rocket)**: You bring your own mass (Oxygen + Fuel) and throw it back. Advantage: Works in vacuum. Disadvantage: Heavy.",
                        next: "q1"
                    },
                    "q1": {
                        visual: "space-thrust",
                        text: "## CHALLENGE\n\nWhy can't a Jet Engine work on the Moon?",
                        choices: [
                            { label: "No gravity.", isCorrect: false, feedback: "Moon has gravity.", next: null },
                            { label: "No atmosphere (Reaction Mass).", isCorrect: true, feedback: "Correct. A Jet needs air to 'eat' and 'throw'. No air = No thrust.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m11",
                title: "Where is it Used?",
                goal: "Environmental Context.",
                nodes: {
                    "start": {
                        visual: "environment-altitude-low",
                        text: "## CONCEPT: DENSITY MATTERS\n\nPropulsion effectiveness depends on density.\n\n**Sea Level**: Thick air. Easy to generate thrust (lots of mass to throw), but high Drag.\n**High Altitude**: Thin air. Low Drag (go fast!), but hard to generate thrust (little mass to throw).",
                        next: "q1"
                    },
                    "q1": {
                        visual: "environment-altitude-high",
                        text: "## CHALLENGE\n\nCommercial airliners cruise at 35,000 feet. Why not higher?",
                        choices: [
                            { label: "Space radiation.", isCorrect: false, feedback: "No.", next: null },
                            { label: "The air is too thin to support the wings/engine.", isCorrect: true, feedback: "Correct. Above that height, they can't grab enough air to stay aloft.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m12",
                title: "When & Why?",
                goal: "Trade-offs.",
                nodes: {
                    "start": {
                        visual: "reaction-rocket",
                        text: "## CONCEPT: THE EFFICIENCY TRAP\n\nRockets are the most powerful engines, but the least efficient.\n\n**Specific Impulse (Isp)** measures efficiency. \n- Jet Engine Isp: ~3000 seconds (Great!)\n- Rocket Isp: ~450 seconds (Terrible!)\n\nWhy? Because Rockets must carry their own oxidizer. 80% of a rocket is just propellant.",
                        next: "q1"
                    },
                    "q1": {
                        visual: "space-thrust",
                        text: "## CHALLENGE\n\nIf we built a 'Rocket Car', it would be incredibly fast. Why don't we use them for commuting?",
                        choices: [
                            { label: "Noise regulations.", isCorrect: false, feedback: "True, but minor.", next: null },
                            { label: "It would run out of fuel in minutes.", isCorrect: true, feedback: "Correct. The fuel efficiency is abysmal.", next: null }
                        ]
                    }
                }
            },
            {
                id: "m13",
                title: "Misconceptions",
                goal: "Correction.",
                nodes: {
                    "start": {
                        visual: "reaction-rocket",
                        text: "## CONCEPT: FORCE IS NOT ENERGY\n\nYou can spend massive Energy and produce Zero Force (Heat). \nYou can produce massive Force and spend Zero Energy (a table holding up a rock).\n\nPropulsion Engineering is maximizing the ratio of **Thrust (Force)** per unit of **Fuel (Energy)**.",
                        next: "q1"
                    },
                    "q1": {
                        visual: "space-thrust",
                        text: "## CHALLENGE\n\n'More Fire = More Speed'. Correct?",
                        choices: [
                            { label: "Yes.", isCorrect: false, feedback: "A bonfire makes fire but no speed.", next: null },
                            { label: "No. Only Directed Momentum Change creates speed.", isCorrect: true, feedback: "Correct. Fire is just heat. Direction is what matters.", next: null }
                        ]
                    }
                }
            }
        ]
    }
];
