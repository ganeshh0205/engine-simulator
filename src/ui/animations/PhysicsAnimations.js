import { gsap } from "gsap";

export class PhysicsAnimations {
    constructor(container) {
        this.container = container;
        this.currentScene = null;
        this.params = { thrust: 0, drag: 0 }; // Lab state
        this.tickerFunc = null; // Store reference to remove listener
    }

    clear() {
        this.container.innerHTML = "";
        gsap.killTweensOf(this.container.children);
        if (this.tickerFunc) {
            gsap.ticker.remove(this.tickerFunc);
            this.tickerFunc = null;
        }
    }

    update(key, value) {
        this.params[key] = value;
        // Visual updates that don't need a loop
        if (this.currentScene === "force" && this.arrowThrust && key === "thrust") {
            this.arrowThrust.style.width = value * 2 + "px"; // Visual scale
        }
        if (this.currentScene === "force" && this.arrowDrag && key === "drag") {
            this.arrowDrag.style.width = value * 2 + "px";
        }

        // Builder Logic: Re-render on assembly change
        if (this.currentScene === "builder") {
            this.setupBuilder(this.params.isRunning ? "running" : "editing");
        }
    }

    loadScene(sceneName, state = "initial") {
        this.clear();
        this.currentScene = sceneName;

        switch (sceneName) {
            case "motion": this.setupMotion(state); break;
            case "velocity": this.setupVelocity(state); break;
            case "force": this.setupForce(state); break;
            case "ice": this.setupIce(state); break; // M3
            case "mass": this.setupMass(state); break; // M3 (Train)
            case "fluid": this.setupFluid(state); break; // M5
            case "space": this.setupSpace(state); break;
            case "reaction": this.setupReaction(state); break;
            case "friction": this.setupFriction(state); break; // M8
            case "types": this.setupTypes(state); break; // M10
            case "environment": this.setupEnvironment(state); break;
            case "builder": this.setupBuilder(state); break; // Phase 3
            default: console.warn("Unknown scene:", sceneName);
        }
    }

    // --- M0: MOTION TYPES ---
    setupMotion(state) {
        this.container.style.background = "#edf2f7";

        // Grid
        const grid = document.createElement("div");
        Object.assign(grid.style, { width: "100%", height: "100%", position: "absolute", top: "0", left: "0", backgroundSize: "40px 40px", backgroundImage: "radial-gradient(#cbd5e0 1px, transparent 1px)" });
        this.container.appendChild(grid);

        const createPiston = (parent, height = "200px") => {
            const wrapper = document.createElement("div");
            Object.assign(wrapper.style, { width: "100%", height: height, position: "relative", background: "rgba(255,255,255,0.5)", borderRadius: "8px", overflow: "hidden", display: "flex", justifyContent: "center" });
            parent.appendChild(wrapper);

            const ns = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(ns, "svg");
            svg.setAttribute("viewBox", "0 0 200 200");
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", "100%");
            wrapper.appendChild(svg);

            // 1. Static Cylinder
            const cyl = document.createElementNS(ns, "path");
            cyl.setAttribute("d", "M 60 20 V 140 M 140 20 V 140"); // Left and Right walls
            cyl.setAttribute("stroke", "#4a5568");
            cyl.setAttribute("stroke-width", "8");
            cyl.setAttribute("fill", "none");
            svg.appendChild(cyl);

            // 2. Crank Wheel
            const crank = document.createElementNS(ns, "circle");
            crank.setAttribute("cx", "100");
            crank.setAttribute("cy", "150");
            crank.setAttribute("r", "30");
            crank.setAttribute("stroke", "#4a5568");
            crank.setAttribute("stroke-width", "4");
            crank.setAttribute("fill", "none");
            svg.appendChild(crank);

            // 3. Connecting Rod (The Line)
            const rod = document.createElementNS(ns, "line");
            rod.setAttribute("stroke", "#a0aec0");
            rod.setAttribute("stroke-width", "8");
            rod.setAttribute("stroke-linecap", "round");
            svg.appendChild(rod);

            // 4. Piston Head (Rect)
            const head = document.createElementNS(ns, "rect");
            head.setAttribute("width", "60");
            head.setAttribute("height", "40");
            head.setAttribute("rx", "4");
            head.setAttribute("fill", "#bcd0eb"); // Light Blue-ish
            head.setAttribute("stroke", "#2b6cb0");
            head.setAttribute("stroke-width", "2");
            svg.appendChild(head);

            // 5. Pin (Red Dot)
            const pin = document.createElementNS(ns, "circle");
            pin.setAttribute("r", "6");
            pin.setAttribute("fill", "#e53e3e");
            svg.appendChild(pin);

            // 6. Wrist Pin (Dark Dot on Head)
            const wrist = document.createElementNS(ns, "circle");
            wrist.setAttribute("r", "4");
            wrist.setAttribute("fill", "#2d3748");
            svg.appendChild(wrist);


            // Animation Logic
            const stats = { angle: 0 };
            const cx = 100;
            const cy = 150;
            const r = 30;
            const rodLen = 85;

            gsap.to(stats, {
                angle: 360,
                duration: 2,
                repeat: -1,
                ease: "none",
                onUpdate: () => {
                    const rad = stats.angle * (Math.PI / 180);

                    // Pin Position (Orbiting Crank Center)
                    const pinX = cx + Math.sin(rad) * r;
                    const pinY = cy - Math.cos(rad) * r;

                    // Piston Head Height Calculation
                    // x distance from center
                    const dx = pinX - cx;
                    // vertical distance component of rod
                    // rodLen^2 = dx^2 + dy^2
                    // dy = sqrt(rodLen^2 - dx^2)
                    const dy = Math.sqrt(rodLen * rodLen - dx * dx);

                    const headY = pinY - dy; // Wrist pin position

                    // Update DOM

                    // Pin
                    pin.setAttribute("cx", pinX);
                    pin.setAttribute("cy", pinY);

                    // Head (Centered at x=100)
                    head.setAttribute("x", 100 - 30); // 30 is half width
                    head.setAttribute("y", headY - 20); // 20 is half height

                    // Wrist Pin
                    wrist.setAttribute("cx", 100);
                    wrist.setAttribute("cy", headY);

                    // Rod (Connects Wrist to Pin)
                    rod.setAttribute("x1", 100);
                    rod.setAttribute("y1", headY);
                    rod.setAttribute("x2", pinX);
                    rod.setAttribute("y2", pinY);
                }
            });

            return wrapper;
        };

        if (state === "all") {
            this.container.style.background = "#f0f4f8";
            const wrapper = document.createElement("div");
            Object.assign(wrapper.style, { display: "flex", flexDirection: "column", width: "100%", height: "100%", minHeight: "400px", justifyContent: "space-evenly", alignItems: "center", padding: "10px 0" });
            this.container.appendChild(wrapper);

            // 1. Linear
            const r1 = document.createElement("div");
            Object.assign(r1.style, { width: "90%", height: "60px", position: "relative", borderBottom: "1px dashed #cbd5e0", background: "rgba(255,255,255,0.5)", borderRadius: "8px" });
            wrapper.appendChild(r1);
            const ball = document.createElement("div");
            Object.assign(ball.style, { width: "30px", height: "30px", background: "#4299e1", borderRadius: "50%", position: "absolute", top: "15px", left: "20px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" });
            r1.appendChild(ball);
            gsap.to(ball, { x: 250, duration: 2, repeat: -1, yoyo: true, ease: "power1.inOut" });
            const l1 = document.createElement("div"); l1.innerText = "1. Linear"; Object.assign(l1.style, { position: "absolute", right: "10px", top: "20px", fontSize: "12px", color: "#2b6cb0", fontWeight: "bold" }); r1.appendChild(l1);

            // 2. Rotary
            const r2 = document.createElement("div");
            Object.assign(r2.style, { width: "90%", height: "80px", position: "relative", borderBottom: "1px dashed #cbd5e0", background: "rgba(255,255,255,0.5)", borderRadius: "8px" });
            wrapper.appendChild(r2);
            const spinner = document.createElement("div");
            Object.assign(spinner.style, { width: "50px", height: "50px", border: "4px solid #ed8936", borderRadius: "50%", position: "absolute", left: "50%", top: "15px", transform: "translateX(-50%)", borderTopColor: "transparent" });
            r2.appendChild(spinner);
            gsap.to(spinner, { rotation: 360, duration: 1, repeat: -1, ease: "none" });
            const l2 = document.createElement("div"); l2.innerText = "2. Rotary"; Object.assign(l2.style, { position: "absolute", right: "10px", top: "30px", fontSize: "12px", color: "#c05621", fontWeight: "bold" }); r2.appendChild(l2);

            // 3. Oscillating
            const p = createPiston(wrapper, "200px");
            p.style.width = "90%";
            const l3 = document.createElement("div"); l3.innerText = "3. Oscillating"; Object.assign(l3.style, { position: "absolute", right: "10px", top: "20px", fontSize: "12px", color: "#2f855a", fontWeight: "bold" }); p.appendChild(l3);

            return;
        }

        const ball = document.createElement("div");
        Object.assign(ball.style, { width: "40px", height: "40px", background: "#4299e1", borderRadius: "50%", position: "absolute", bottom: "50%", left: "50%", transform: "translate(-50%, 50%)", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" });
        this.container.appendChild(ball); // Default fallback

        if (state === "linear") {
            gsap.fromTo(ball, { x: -200 }, { x: 200, duration: 2, repeat: -1, yoyo: true, ease: "power1.inOut" });
        } else if (state === "rotary") {
            this.container.innerHTML = ""; this.container.appendChild(grid); // Clear ball
            const spinner = document.createElement("div");
            Object.assign(spinner.style, { width: "100px", height: "100px", border: "8px solid #ed8936", borderRadius: "50%", position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", borderTopColor: "transparent" });
            this.container.appendChild(spinner);
            gsap.to(spinner, { rotation: 360, duration: 1, repeat: -1, ease: "none" });
        } else if (state === "oscillating") {
            this.container.innerHTML = ""; this.container.appendChild(grid); // Clear ball
            const p = createPiston(this.container, "300px");
            p.style.width = "300px"; p.style.left = "50%"; p.style.top = "50%"; p.style.transform = "translate(-50%, -50%)";
        }
    }

    // --- M1: SPEED VS VELOCITY ---
    setupVelocity(state) {
        this.container.style.background = "#f7fafc";

        // Helper: Create High-Fidelity Car (Top Down)
        const createCar = (color = "#e53e3e") => {
            const car = document.createElement("div");
            Object.assign(car.style, {
                width: "50px", height: "24px", position: "relative",
                borderRadius: "4px", boxShadow: "0 4px 6px rgba(0,0,0,0.2)"
            });

            // Chassis
            const body = document.createElement("div");
            Object.assign(body.style, { width: "100%", height: "100%", background: color, borderRadius: "6px", position: "absolute", zIndex: "2" });
            car.appendChild(body);

            // Roof/Window
            const roof = document.createElement("div");
            Object.assign(roof.style, { width: "25px", height: "18px", background: "#2d3748", position: "absolute", top: "3px", left: "15px", borderRadius: "2px", zIndex: "3" });
            car.appendChild(roof);

            // Wheels
            const wheelStyle = { width: "12px", height: "4px", background: "#1a202c", position: "absolute", borderRadius: "2px", zIndex: "1" };
            const w1 = document.createElement("div"); Object.assign(w1.style, { ...wheelStyle, top: "-2px", left: "8px" }); car.appendChild(w1);
            const w2 = document.createElement("div"); Object.assign(w2.style, { ...wheelStyle, bottom: "-2px", left: "8px" }); car.appendChild(w2);
            const w3 = document.createElement("div"); Object.assign(w3.style, { ...wheelStyle, top: "-2px", right: "8px" }); car.appendChild(w3);
            const w4 = document.createElement("div"); Object.assign(w4.style, { ...wheelStyle, bottom: "-2px", right: "8px" }); car.appendChild(w4);

            // Spolier
            const spoiler = document.createElement("div");
            Object.assign(spoiler.style, { width: "8px", height: "20px", background: "#742a2a", position: "absolute", right: "0", top: "2px", zIndex: "3", borderRadius: "2px" });
            car.appendChild(spoiler);

            return car;
        };

        if (state === "interactive") {
            // Lab Mode: Vector Steering
            this.container.style.background = "#e2e8f0";
            this.params = { steering: 0, heading: 0, x: 50, y: 50, speed: 0.5 };

            // Grid Floor (Infinite Scroll illusion implemented via wrapping coords)
            const grid = document.createElement("div");
            Object.assign(grid.style, {
                width: "200%", height: "200%", position: "absolute", top: "-50%", left: "-50%",
                backgroundImage: "linear-gradient(#cbd5e0 1px, transparent 1px), linear-gradient(90deg, #cbd5e0 1px, transparent 1px)",
                backgroundSize: "50px 50px"
            });
            this.container.appendChild(grid);

            // Trace path (Tire marks)
            const canvas = document.createElement("canvas");
            canvas.width = this.container.clientWidth;
            canvas.height = this.container.clientHeight;
            Object.assign(canvas.style, { position: "absolute", top: "0", left: "0", pointerEvents: "none" });
            this.container.appendChild(canvas);
            const ctx = canvas.getContext("2d");
            ctx.strokeStyle = "rgba(0,0,0,0.1)";
            ctx.lineWidth = 4;

            // The Car
            const car = createCar("#4299e1");
            Object.assign(car.style, { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
            this.container.appendChild(car);

            // Vector Arrow (Velocity)
            const arrow = document.createElement("div");
            Object.assign(arrow.style, {
                height: "4px", background: "#e53e3e", position: "absolute", left: "50%", top: "50%",
                width: "80px", transformOrigin: "left center", zIndex: "10"
            });
            this.container.appendChild(arrow);
            const label = document.createElement("div"); label.innerText = "Velocity Vector"; Object.assign(label.style, { color: "#e53e3e", fontWeight: "bold", fontSize: "12px", position: "absolute", right: "0", top: "-20px" }); arrow.appendChild(label);


            // HUD
            const hud = document.createElement("div");
            hud.innerHTML = "Turn the Wheel!<br>See how Velocity changes direction.";
            Object.assign(hud.style, { position: "absolute", top: "20px", left: "20px", fontFamily: "monospace", color: "#4a5568" });
            this.container.appendChild(hud);

            // Update Loop
            this.tickerFunc = () => {
                // Update Heading based on Steering
                // Steering is -50 to 50. Map to radians.
                const turnRate = (this.params.steering || 0) * 0.001;
                this.params.heading += turnRate;

                // Move Grid opposite to Heading (Camera follows car)
                const gridX = Math.cos(this.params.heading) * 2;
                const gridY = Math.sin(this.params.heading) * 2;

                let currentBgX = parseFloat(grid.style.transform.split("(")[1]) || 0; // Simplified parsing, usually better to track yourself
                // Actually tracking grid pos in params is safer
                this.params.gridX = (this.params.gridX || 0) - gridX;
                this.params.gridY = (this.params.gridY || 0) - gridY;

                // Wrap texture
                const wrapX = this.params.gridX % 50;
                const wrapY = this.params.gridY % 50;
                grid.style.transform = `translate(${wrapX}px, ${wrapY}px)`;

                // Rotate Car
                gsap.set(car, { rotation: this.params.heading * (180 / Math.PI) });

                // Rotate Arrow (Always points forward relative to car? No, Velocity IS heading)
                gsap.set(arrow, { rotation: this.params.heading * (180 / Math.PI) });

                // Draw tire tracks
                // We draw small segments at the center of the screen, then fade them? 
                // Creating a persistent trail on a moving background is hard. 
                // Simpler: Just clear text if needed.
            };
            gsap.ticker.add(this.tickerFunc);
            return;
        }

        // --- OLD STATIC SCENES (Re-implemented using new Car) ---

        // Track
        const track = document.createElement("div");
        Object.assign(track.style, { width: "300px", height: "300px", border: "40px solid #cbd5e0", borderRadius: "50%", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" });
        this.container.appendChild(track);

        const car = createCar("#e53e3e");
        Object.assign(car.style, { position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)" });
        track.appendChild(car);

        if (state === "circle") {
            // Constant Speed, Changing Velocity
            gsap.to(track, { rotation: 360, duration: 4, repeat: -1, ease: "none" });

            const label = document.createElement("div");
            label.innerText = "Speed: Constant\nVelocity: CHANGING";
            Object.assign(label.style, { position: "absolute", width: "100%", textAlign: "center", top: "45%", fontFamily: "monospace", color: "#e53e3e" });
            this.container.appendChild(label);
        } else if (state === "straight") {
            track.style.display = "none";
            const road = document.createElement("div");
            Object.assign(road.style, { width: "100%", height: "80px", background: "#cbd5e0", position: "absolute", top: "50%", transform: "translateY(-50%)" });
            this.container.appendChild(road);

            const car2 = createCar("#48bb78");
            Object.assign(car2.style, { position: "absolute", top: "28px", left: "0" });
            road.appendChild(car2);

            gsap.to(car2, { x: 500, duration: 2, repeat: -1, ease: "none" });

            const label = document.createElement("div");
            label.innerText = "Velocity: Constant";
            Object.assign(label.style, { position: "absolute", width: "100%", textAlign: "center", top: "30%", fontFamily: "monospace", color: "#48bb78" });
            this.container.appendChild(label);
        }
    }

    // --- M2: FORCE ---
    setupForce(state) {
        this.container.style.background = "#fff";

        if (state === "interactive") {
            // Lab Mode
            this.params = { thrust: 50, drag: 50, velocity: 0, x: 50 }; // Init

            // Road / Background
            const bg = document.createElement("div");
            Object.assign(bg.style, { width: "100%", height: "100%", background: "linear-gradient(#ebf8ff 50%, #f7fafc 50%)" });
            this.container.appendChild(bg);

            // The Object (Car/Block)
            const block = document.createElement("div");
            Object.assign(block.style, {
                width: "80px", height: "40px", background: "#2d3748",
                position: "absolute", bottom: "50%", left: "50%", transform: "translate(-50%, 50%)",
                borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "10px"
            });
            block.innerText = "MASS: 100kg";
            this.container.appendChild(block);

            // Speedometer
            const speedo = document.createElement("div");
            Object.assign(speedo.style, {
                position: "absolute", top: "20px", right: "20px",
                fontFamily: "monospace", fontSize: "14px", fontWeight: "bold", color: "#2d3748"
            });
            this.container.appendChild(speedo);

            // Arrows
            this.arrowThrust = document.createElement("div");
            Object.assign(this.arrowThrust.style, {
                height: "10px", background: "#48bb78", position: "absolute", left: "100px", top: "15px", // Relative to block? No, append to block for easier move
                width: "50px", transformOrigin: "left center"
            });
            // Actually better to append to block
            block.appendChild(this.arrowThrust);
            this.arrowThrust.style.left = "80px"; // Off the right edge

            this.arrowDrag = document.createElement("div");
            Object.assign(this.arrowDrag.style, {
                height: "10px", background: "#e53e3e", position: "absolute", right: "80px", top: "15px",
                width: "50px", transformOrigin: "right center"
            });
            block.appendChild(this.arrowDrag);

            // Labels
            const tL = document.createElement("div"); tL.innerText = "Thrust"; Object.assign(tL.style, { fontSize: "8px", position: "absolute", top: "-15px", color: "#48bb78" }); this.arrowThrust.appendChild(tL);
            const dL = document.createElement("div"); dL.innerText = "Drag"; Object.assign(dL.style, { fontSize: "8px", position: "absolute", top: "-15px", right: "0", color: "#e53e3e" }); this.arrowDrag.appendChild(dL);

            // Clouds for parallax
            const clouds = [];
            for (let i = 0; i < 5; i++) {
                const c = document.createElement("div");
                Object.assign(c.style, { width: "60px", height: "30px", background: "white", borderRadius: "30px", position: "absolute", top: (10 + Math.random() * 30) + "%", left: Math.random() * 100 + "%", opacity: 0.8 });
                this.container.appendChild(c);
                clouds.push(c);
            }

            // Physics Loop
            this.tickerFunc = () => {
                // Newton's 2nd Law: F = ma  => a = F/m
                // Let Net Force = Thrust - Drag
                // Let Mass = 100 (arbitrary units)
                const netForce = this.params.thrust - this.params.drag;
                const acceleration = netForce * 0.05; // Scaling factor

                this.params.velocity += acceleration;

                // Friction-ish decay if no force? No, user explicitly sets Drag.

                // Update Speedometer
                speedo.innerText = `VELOCITY: ${Math.round(this.params.velocity)} m/s`;

                // Move Background (Parallax) to simulate camera tracking the object
                // If velocity > 0, background moves Left.
                clouds.forEach(c => {
                    let x = parseFloat(c.style.left) || 0;
                    x -= this.params.velocity * 0.1; // Parallax speed
                    if (x < -10) x = 110; // Wrap
                    if (x > 110) x = -10;
                    c.style.left = x + "%";
                });
            };

            gsap.ticker.add(this.tickerFunc);
            return;
        }

        if (state === "plane-equilibrium") {
            // Airplane shape
            const plane = document.createElement("div");
            Object.assign(plane.style, {
                width: "0", height: "0",
                borderLeft: "20px solid transparent", borderRight: "20px solid transparent", borderBottom: "60px solid #2d3748",
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(90deg)"
            });
            this.container.appendChild(plane);

            // Thrust
            const thrust = document.createElement("div");
            Object.assign(thrust.style, { width: "60px", height: "4px", background: "#48bb78", position: "absolute", right: "-40px", top: "50%" }); // Forward
            plane.appendChild(thrust);
            const tLabel = document.createElement("div"); tLabel.innerText = "Thrust"; Object.assign(tLabel.style, { color: "#48bb78", position: "absolute", right: "-40px", top: "-20px", fontSize: "10px", transform: "rotate(-90deg)" }); plane.appendChild(tLabel);

            // Drag
            const drag = document.createElement("div");
            Object.assign(drag.style, { width: "60px", height: "4px", background: "#e53e3e", position: "absolute", left: "-40px", top: "50%" }); // Backward
            plane.appendChild(drag);
            const dLabel = document.createElement("div"); dLabel.innerText = "Drag"; Object.assign(dLabel.style, { color: "#e53e3e", position: "absolute", left: "-40px", top: "-20px", fontSize: "10px", transform: "rotate(-90deg)" }); plane.appendChild(dLabel);

            const label = document.createElement("div");
            label.innerText = "Constant Velocity = Equilibrium";
            Object.assign(label.style, { position: "absolute", top: "20%", width: "100%", textAlign: "center", color: "#2d3748" });
            this.container.appendChild(label);

            // Move background to show speed
            const cloud = document.createElement("div");
            Object.assign(cloud.style, { width: "60px", height: "30px", background: "#cbd5e0", borderRadius: "20px", position: "absolute", top: "20%", left: "100%" });
            this.container.appendChild(cloud);
            gsap.to(cloud, { x: -600, duration: 2, repeat: -1, ease: "none" });
            return;
        }

        const block = document.createElement("div");
        Object.assign(block.style, { width: "60px", height: "60px", background: "#2d3748", position: "absolute", bottom: "50%", left: "50%", transform: "translate(-50%, 50%)", borderRadius: "4px" });
        this.container.appendChild(block);

        if (state === "balanced") {
            // Arrows
            const leftArrow = document.createElement("div");
            Object.assign(leftArrow.style, { width: "50px", height: "10px", background: "#e53e3e", position: "absolute", left: "-60px", top: "25px" });
            block.appendChild(leftArrow);
            leftArrow.style.left = "-50px";

            const rightArrow = document.createElement("div");
            Object.assign(rightArrow.style, { width: "50px", height: "10px", background: "#e53e3e", position: "absolute", right: "-50px", top: "25px" });
            block.appendChild(rightArrow);

            const label = document.createElement("div");
            label.innerText = "F_net = 0";
            Object.assign(label.style, { position: "absolute", top: "-30px", width: "100%", textAlign: "center", color: "#2d3748", fontWeight: "bold" });
            block.appendChild(label);
        } else if (state === "unbalanced") {
            const leftArrow = document.createElement("div");
            Object.assign(leftArrow.style, { width: "80px", height: "10px", background: "#48bb78", position: "absolute", left: "-80px", top: "25px" });
            block.appendChild(leftArrow);

            const label = document.createElement("div");
            label.innerText = "F_net > 0 -> Accel";
            Object.assign(label.style, { position: "absolute", top: "-30px", width: "200px", left: "-70px", textAlign: "center", color: "#2d3748", fontWeight: "bold" });
            block.appendChild(label);

            gsap.to(block, { x: 200, duration: 1.5, ease: "power2.in", repeat: -1 });
        }
    }

    setupMass(state) { // M3 new
        this.container.style.background = "#edf2f7";
        if (state === "comparison") {
            // Helper: Create Steam Train (CSS Art)
            const createTrain = () => {
                const train = document.createElement("div");
                Object.assign(train.style, { width: "160px", height: "100px", position: "relative" });

                // Boiler
                const boiler = document.createElement("div");
                Object.assign(boiler.style, { width: "100px", height: "50px", background: "#2d3748", borderRadius: "50px 0 0 0", position: "absolute", bottom: "20px", left: "20px" });
                train.appendChild(boiler);

                // Cab
                const cab = document.createElement("div");
                Object.assign(cab.style, { width: "50px", height: "70px", background: "#2a4365", position: "absolute", bottom: "20px", right: "0", borderRadius: "4px 4px 0 0", borderTop: "4px solid #ecc94b" });
                train.appendChild(cab);

                // Window
                const win = document.createElement("div");
                Object.assign(win.style, { width: "30px", height: "20px", background: "#63b3ed", position: "absolute", top: "10px", right: "10px", border: "2px solid #1a202c" });
                cab.appendChild(win);

                // Chimney
                const stack = document.createElement("div");
                Object.assign(stack.style, { width: "20px", height: "30px", background: "#1a202c", position: "absolute", bottom: "70px", left: "40px", borderRadius: "4px 4px 0 0" });
                train.appendChild(stack);
                // Smoke logic could go here

                // Wheels
                const w1 = document.createElement("div"); Object.assign(w1.style, { width: "30px", height: "30px", background: "#822727", borderRadius: "50%", border: "4px solid #cbd5e0", position: "absolute", bottom: "0", left: "30px" }); train.appendChild(w1);
                const w2 = document.createElement("div"); Object.assign(w2.style, { width: "30px", height: "30px", background: "#822727", borderRadius: "50%", border: "4px solid #cbd5e0", position: "absolute", bottom: "0", left: "70px" }); train.appendChild(w2);
                const w3 = document.createElement("div"); Object.assign(w3.style, { width: "20px", height: "20px", background: "#822727", borderRadius: "50%", border: "2px solid #cbd5e0", position: "absolute", bottom: "0", right: "10px" }); train.appendChild(w3);

                // Rod animation
                gsap.to([w1, w2, w3], { rotation: 360, duration: 2, repeat: -1, ease: "none" });

                const label = document.createElement("div"); label.innerText = "MASS: 100,000 kg"; Object.assign(label.style, { position: "absolute", top: "-20px", width: "100%", textAlign: "center", fontWeight: "bold", fontSize: "10px", color: "#2d3748" }); train.appendChild(label);

                return train;
            };

            // Helper: Create Bicycle (CSS Art)
            const createBike = () => {
                const bike = document.createElement("div");
                Object.assign(bike.style, { width: "80px", height: "50px", position: "relative" });

                // Frame (Triangles using borders or thin divs)
                const frameColor = "#f56565";
                const w1 = document.createElement("div"); Object.assign(w1.style, { width: "25px", height: "25px", border: "2px solid #4a5568", borderRadius: "50%", position: "absolute", bottom: "0", left: "0" }); bike.appendChild(w1);
                const w2 = document.createElement("div"); Object.assign(w2.style, { width: "25px", height: "25px", border: "2px solid #4a5568", borderRadius: "50%", position: "absolute", bottom: "0", right: "0" }); bike.appendChild(w2);

                // Frame bar
                const bar = document.createElement("div"); Object.assign(bar.style, { width: "40px", height: "2px", background: frameColor, position: "absolute", top: "20px", left: "12px", transform: "rotate(-10deg)" }); bike.appendChild(bar);
                const seatPost = document.createElement("div"); Object.assign(seatPost.style, { width: "2px", height: "25px", background: frameColor, position: "absolute", top: "10px", left: "20px", transform: "rotate(15deg)" }); bike.appendChild(seatPost);
                const fork = document.createElement("div"); Object.assign(fork.style, { width: "2px", height: "25px", background: "#a0aec0", position: "absolute", top: "15px", right: "12px", transform: "rotate(-15deg)" }); bike.appendChild(fork);

                // Wheels Spin
                gsap.to([w1, w2], { rotation: 360, duration: 1, repeat: -1, ease: "none" });

                const label = document.createElement("div"); label.innerText = "Mass: 15 kg"; Object.assign(label.style, { position: "absolute", top: "-10px", width: "100%", textAlign: "center", fontWeight: "bold", fontSize: "10px", color: "#2d3748" }); bike.appendChild(label);

                return bike;
            };

            // Render
            const train = createTrain();
            Object.assign(train.style, { position: "absolute", top: "25%", left: "-180px" });
            this.container.appendChild(train);

            const bike = createBike();
            Object.assign(bike.style, { position: "absolute", top: "60%", left: "-100px" });
            this.container.appendChild(bike);

            // Animation Loop (Both moving right)
            // Train takes long to stop (implemented visually by just moving constantly for now, effectively infinite inertia visual)
            gsap.to(train, { x: 700, duration: 10, ease: "none", repeat: -1 });
            gsap.to(bike, { x: 700, duration: 10, ease: "none", repeat: -1 });

            // Impact/Force arrows? 
            // The lesson is about "Harder to Stop".

            // HUD
            const hud = document.createElement("div");
            hud.innerText = "Same Speed (10 m/s)\nDifferent INERTIA";
            Object.assign(hud.style, { position: "absolute", top: "10px", left: "20px", fontFamily: "monospace", color: "#718096" });
            this.container.appendChild(hud);
        }
    }

    setupFriction(state) { // M8 new
        this.container.style.background = "#edf2f7";
        const road = document.createElement("div");
        Object.assign(road.style, { width: "100%", height: "2px", background: "#a0aec0", position: "absolute", top: "60%" });
        this.container.appendChild(road);

        const car = document.createElement("div");
        Object.assign(car.style, { width: "60px", height: "30px", background: "#ed8936", position: "absolute", top: "calc(60% - 30px)", left: "20%", borderRadius: "8px 8px 0 0" });
        this.container.appendChild(car);

        // Engine Force
        const fEng = document.createElement("div");
        Object.assign(fEng.style, { width: "40px", height: "4px", background: "#48bb78", position: "absolute", right: "-45px", top: "15px" });
        car.appendChild(fEng);

        // Drag Force
        const fDrag = document.createElement("div");
        Object.assign(fDrag.style, { width: "40px", height: "4px", background: "#e53e3e", position: "absolute", left: "-45px", top: "15px" });
        car.appendChild(fDrag);

        const label = document.createElement("div");
        label.innerText = "Engine vs Drag";
        Object.assign(label.style, { position: "absolute", top: "-20px", width: "100px", left: "-20px", fontSize: "10px" });
        car.appendChild(label);

        // Wheels
        const w1 = document.createElement("div"); Object.assign(w1.style, { width: "12px", height: "12px", background: "#2d3748", borderRadius: "50%", position: "absolute", bottom: "-6px", left: "10px" }); car.appendChild(w1);
        const w2 = document.createElement("div"); Object.assign(w2.style, { width: "12px", height: "12px", background: "#2d3748", borderRadius: "50%", position: "absolute", bottom: "-6px", right: "10px" }); car.appendChild(w2);

        gsap.to([w1, w2], { rotation: 360, duration: 0.5, repeat: -1, ease: "none" });

        // Road move
        gsap.to(road, { x: -100, duration: 0.5, ease: "none", repeat: -1 }); // Road doesn't have texture, need stripes
    }


    // --- M3: ICE (INERTIA) - CORRECTED ---
    setupIce(state) {
        // Ice Floor
        this.container.style.background = "linear-gradient(to bottom, #ebf8ff 0%, #bee3f8 100%)";

        // Horizon Line
        const horizon = document.createElement("div");
        Object.assign(horizon.style, { width: "100%", height: "2px", background: "#90cdf4", position: "absolute", top: "40%" });
        this.container.appendChild(horizon);

        // The Object (Steel Block)
        const block = document.createElement("div");
        Object.assign(block.style, {
            width: "50px", height: "30px", background: "#718096",
            position: "absolute", bottom: "30%", left: "-60px",
            border: "2px solid #4a5568", borderRadius: "4px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
        });
        this.container.appendChild(block);

        // Reflection
        const reflection = document.createElement("div");
        Object.assign(reflection.style, {
            width: "50px", height: "30px", background: "#718096",
            position: "absolute", bottom: "-32px", left: "0",
            transform: "scaleY(-1)", opacity: "0.3", filter: "blur(2px)"
        });
        block.appendChild(reflection);

        // The Pusher (A hand/glove)
        const hand = document.createElement("div");
        Object.assign(hand.style, {
            width: "40px", height: "40px", background: "#e53e3e",
            borderRadius: "50%", position: "absolute", bottom: "30%", left: "-120px",
            zIndex: "10"
        });
        this.container.appendChild(hand);

        // Animation Sequence
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

        // 1. Enter
        tl.set(block, { x: 50 }); // Start on screen
        tl.set(hand, { x: 0, opacity: 1 });

        // 2. The Push (Contact)
        tl.to(hand, { x: 50, duration: 0.5, ease: "power2.in" }); // Hand moves to block

        // 3. The Shove (Acceleration)
        tl.to([block, hand], { x: "+=100", duration: 0.3, ease: "power2.out" }); // Both move fast

        // 4. Release (Hand stops, Block keeps going)
        tl.to(hand, { x: "-=50", opacity: 0, duration: 0.5 }, "release"); // Hand pulls back
        tl.to(block, { x: 600, duration: 2, ease: "none" }, "release"); // Block coasts at constant speed (Inertia)
    }

    // --- M5: FLUID FLOW ---
    setupFluid(state) {
        this.container.style.background = "#2c5282"; // Deep Blue

        const tunnel = document.createElement("div");
        Object.assign(tunnel.style, { width: "100%", height: "100px", borderTop: "2px solid #63b3ed", borderBottom: "2px solid #63b3ed", position: "absolute", bottom: "40%" });
        this.container.appendChild(tunnel);

        // Smoke Lines
        for (let i = 0; i < 10; i++) {
            const line = document.createElement("div");
            Object.assign(line.style, { width: "100px", height: "2px", background: "rgba(255,255,255,0.5)", position: "absolute", top: (10 * i) + "px", left: "-100px" });
            tunnel.appendChild(line);

            if (state === "laminar") {
                gsap.to(line, { x: 800, duration: 2, delay: i * 0.1, repeat: -1, ease: "none" });
            } else if (state === "turbulent") {
                gsap.to(line, { x: 800, y: Math.random() * 50 - 25, rotation: Math.random() * 90, duration: 2, delay: i * 0.1, repeat: -1, ease: "none" });
            }
        }
    }

    // --- SCENE 7: SPACE VS AIR (M6, M7) ---
    setupSpace(state) {
        const ship = document.createElement("div");
        Object.assign(ship.style, {
            width: "60px", height: "30px", background: "#cbd5e0",
            position: "absolute", bottom: "50%", left: "50px",
            borderRadius: "4px 20px 20px 4px", border: "2px solid #718096"
        });
        this.container.appendChild(ship);

        if (state === "coasting") {
            // Stars background
            this.container.style.background = "#000";
            for (let i = 0; i < 50; i++) {
                const star = document.createElement("div");
                Object.assign(star.style, { width: "2px", height: "2px", background: "#fff", position: "absolute", top: Math.random() * 100 + "%", left: Math.random() * 100 + "%" });
                this.container.appendChild(star);
                gsap.to(star, { x: "-=100", duration: 2, repeat: -1, ease: "none" });
            }
            // Ship floats
            gsap.to(ship, { y: "-=10", duration: 2, yoyo: true, repeat: -1, ease: "sine.inOut" });

        } else if (state === "drag") {
            // Atmosphere
            this.container.style.background = "#ebf8ff"; // Light blue

            // Drag Arrows
            const drag = document.createElement("div");
            Object.assign(drag.style, { width: "0", height: "0", borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "20px solid #e53e3e", position: "absolute", right: "-30px", top: "5px" });
            ship.appendChild(drag);

            // Slows down
            gsap.to(ship, { x: 300, duration: 2, ease: "power2.out" }); // Stops

        } else if (state === "thrust") {
            this.container.style.background = "#ebf8ff";

            // Thrust Flame
            const flame = document.createElement("div");
            Object.assign(flame.style, { width: "20px", height: "10px", background: "#f6ad55", borderRadius: "50%", position: "absolute", left: "-20px", top: "10px" });
            ship.appendChild(flame);
            gsap.to(flame, { width: "30px", duration: 0.1, yoyo: true, repeat: -1 });

            // Drag Exists
            const drag = document.createElement("div");
            Object.assign(drag.style, { width: "0", height: "0", borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "20px solid #e53e3e", position: "absolute", right: "-30px", top: "5px" });
            ship.appendChild(drag);

            // Constant Speed (Forces Balanced)
            gsap.to(ship, { y: "+=5", duration: 0.5, yoyo: true, repeat: -1 }); // Shake
            // Background moves to imply speed
            for (let i = 0; i < 20; i++) {
                const cloud = document.createElement("div");
                Object.assign(cloud.style, { width: "40px", height: "20px", background: "white", borderRadius: "20px", position: "absolute", top: Math.random() * 100 + "%", left: "100%", opacity: "0.5" });
                this.container.appendChild(cloud);
                gsap.to(cloud, { x: -600, duration: 2, repeat: -1, ease: "none", delay: Math.random() });
            }
        }
    }

    // --- SCENE 8: REACTION (M8, M9) ---
    setupReaction(state) {
        if (state === "ice-throw") {
            const skater = document.createElement("div");
            Object.assign(skater.style, { width: "20px", height: "50px", background: "#2b6cb0", position: "absolute", bottom: "100px", left: "50%", borderRadius: "10px" });
            this.container.appendChild(skater);

            const ball = document.createElement("div");
            Object.assign(ball.style, { width: "15px", height: "15px", background: "#ed8936", borderRadius: "50%", position: "absolute", top: "10px", right: "-10px" });
            skater.appendChild(ball);

            // Throw Animation
            gsap.to(ball, { x: 300, y: 50, duration: 1, ease: "power1.out", repeat: -1, delay: 1 });
            gsap.to(skater, { x: -200, duration: 2, ease: "power1.out", repeat: -1, delay: 1 }); // Recoil

            // Reset loop
            gsap.set([ball, skater], { x: 0, y: 0, delay: 0 });

        } else if (state === "rocket-fire") {
            this.container.style.background = "#1a202c";
            const rocket = document.createElement("div");
            Object.assign(rocket.style, { width: "60px", height: "30px", background: "#cbd5e0", position: "absolute", bottom: "50%", left: "40%", borderRadius: "4px 20px 20px 4px" });
            this.container.appendChild(rocket);

            // Exhaust
            for (let i = 0; i < 20; i++) {
                const p = document.createElement("div");
                Object.assign(p.style, { width: "5px", height: "5px", background: "#f6e05e", borderRadius: "50%", position: "absolute", top: "12px", left: "0" });
                rocket.appendChild(p);
                gsap.to(p, { x: -200, y: (Math.random() - 0.5) * 50, opacity: 0, duration: 0.5, repeat: -1 });
            }

            // Rocket moves
            gsap.to(rocket, { x: "+=2", duration: 0.1, yoyo: true, repeat: -1 }); // Vibration
        }
    }

    // --- SCENE 9: ENVIRONMENT (M10-M12) ---
    setupEnvironment(state) {
        // Plane
        const plane = document.createElement("div");
        Object.assign(plane.style, { width: "50px", height: "10px", background: "#4a5568", position: "absolute", bottom: "50%", left: "100px" });
        this.container.appendChild(plane);

        const count = state === "altitude-high" ? 10 : 100;
        const color = state === "altitude-high" ? "#63b3ed" : "#2c5282";

        for (let i = 0; i < count; i++) {
            const molecule = document.createElement("div");
            Object.assign(molecule.style, { width: "4px", height: "4px", background: color, borderRadius: "50%", position: "absolute", top: Math.random() * 100 + "%", left: "100%" });
            this.container.appendChild(molecule);
            gsap.to(molecule, { x: -600, duration: 1 + Math.random(), repeat: -1, ease: "none" });
        }
    }

    setupTypes(state) { // M10
        this.container.style.background = "#edf2f7";
        if (state === "comparison") {
            // 1. Propeller (Air Breathing)
            const prop = document.createElement("div");
            Object.assign(prop.style, { width: "120px", height: "60px", background: "white", position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", borderRadius: "8px", border: "1px solid #cbd5e0", padding: "5px" });
            this.container.appendChild(prop);

            const label1 = document.createElement("div"); label1.innerText = "Interaction (Air)"; Object.assign(label1.style, { fontSize: "10px", color: "#2d3748", fontWeight: "bold" }); prop.appendChild(label1);

            // Fan animation
            const fan = document.createElement("div");
            Object.assign(fan.style, { width: "4px", height: "40px", background: "#4299e1", position: "absolute", left: "-5px", top: "10px" });
            prop.appendChild(fan);
            gsap.to(fan, { scaleY: 0.1, duration: 0.05, repeat: -1, yoyo: true }); // Fast spin visual

            // Air intake
            const air = document.createElement("div");
            Object.assign(air.style, { width: "40px", height: "2px", background: "#cbd5e0", position: "absolute", left: "-40px", top: "30px" });
            prop.appendChild(air);
            gsap.to(air, { x: 20, opacity: 0, duration: 0.5, repeat: -1 });

            // 2. Rocket (Reaction)
            const rock = document.createElement("div");
            Object.assign(rock.style, { width: "120px", height: "60px", background: "#2d3748", position: "absolute", bottom: "20%", left: "50%", transform: "translateX(-50%)", borderRadius: "8px", color: "white", padding: "5px" });
            this.container.appendChild(rock);

            const label2 = document.createElement("div"); label2.innerText = "Reaction (Rocket)"; Object.assign(label2.style, { fontSize: "10px", color: "#cbd5e0", fontWeight: "bold" }); rock.appendChild(label2);

            // Tank
            const tank = document.createElement("div");
            Object.assign(tank.style, { width: "30px", height: "30px", background: "#e53e3e", borderRadius: "50%", position: "absolute", right: "10px", top: "15px" });
            rock.appendChild(tank);
            const tLabel = document.createElement("div"); tLabel.innerText = "Fuel"; Object.assign(tLabel.style, { fontSize: "8px", position: "absolute", top: "8px", left: "2px", color: "white" }); tank.appendChild(tLabel);

            // Flame
            const flame = document.createElement("div");
            Object.assign(flame.style, { width: "20px", height: "10px", background: "#f6ad55", position: "absolute", left: "-20px", top: "25px", borderRadius: "50%" });
            rock.appendChild(flame);
            gsap.to(flame, { scaleX: 1.5, duration: 0.1, repeat: -1, yoyo: true });
        }
    }

    // --- PHASE 3: ENGINE BUILDER ---
    setupBuilder(state) {
        this.container.style.background = "#2d3748"; // Dark Blueprint mode

        // Define Params if new
        if (!this.params.assembly) {
            this.params.assembly = []; // List of part strings: "inlet", "comp", "comb", "turb", "noz"
            this.params.isRunning = false;
        }

        // Test Stand
        const stand = document.createElement("div");
        Object.assign(stand.style, { width: "80%", height: "10px", background: "#718096", position: "absolute", bottom: "20%", left: "10%" });
        this.container.appendChild(stand);

        // Core Shaft (Ghost)
        const shaft = document.createElement("div");
        Object.assign(shaft.style, { width: "60%", height: "4px", background: "#a0aec0", position: "absolute", top: "50%", left: "20%", opacity: "0.5" });
        this.container.appendChild(shaft);

        const partMap = {
            "inlet": { color: "#63b3ed", width: 40, height: 60, label: "Inlet" },
            "compressor": { color: "#4299e1", width: 40, height: 50, label: "Comp" },
            "combustor": { color: "#ed8936", width: 50, height: 50, label: "Comb" },
            "turbine": { color: "#9b2c2c", width: 40, height: 50, label: "Turb" },
            "nozzle": { color: "#a0aec0", width: 30, height: 40, label: "Nozz" }
        };

        // Render Assembly
        let xOffset = 20; // Percent
        const partsContainer = document.createElement("div");
        Object.assign(partsContainer.style, { position: "absolute", width: "100%", height: "100%", top: "0", left: "0" });
        this.container.appendChild(partsContainer);

        this.params.assembly.forEach((partName, index) => {
            const spec = partMap[partName];
            if (!spec) return;

            const part = document.createElement("div");
            Object.assign(part.style, {
                width: spec.width + "px", height: spec.height + "px",
                background: spec.color, border: "2px solid #1a202c", borderRadius: "4px",
                position: "absolute", top: "50%", transform: "translateY(-50%)",
                left: `calc(${xOffset}% + ${index * 50}px)`, // Simple stacking
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: "10px", fontWeight: "bold"
            });
            part.innerText = spec.label;
            partsContainer.appendChild(part);

            // Animation if running
            if (this.params.isRunning) {
                if (partName === "compressor" || partName === "turbine") {
                    gsap.to(part, { rotation: 360, duration: 0.2, repeat: -1, ease: "none" }); // Spin!
                }
                if (partName === "combustor") {
                    gsap.to(part, { backgroundColor: "#f6ad55", duration: 0.1, yoyo: true, repeat: -1 }); // Flicker
                }
            }
        });

        // Exhaust / Thrust Effect
        if (this.params.isRunning) {
            // Check validity: Inlet -> Comp -> Comb -> Turb -> Nozzle
            // For now, strict order check? Or just presence?
            // Let's assume simpler: if Combustor + Turbine exists?

            const hasComb = this.params.assembly.includes("combustor");
            const hasTurb = this.params.assembly.includes("turbine");

            if (hasComb && hasTurb) {
                // Success Fire
                const fire = document.createElement("div");
                Object.assign(fire.style, {
                    width: "100px", height: "40px", background: "linear-gradient(to right, #f6ad55, transparent)",
                    position: "absolute", top: "50%", transform: "translateY(-50%)",
                    left: `calc(${xOffset}% + ${this.params.assembly.length * 50}px)`
                });
                this.container.appendChild(fire);
                gsap.fromTo(fire, { width: "80px" }, { width: "120px", duration: 0.1, yoyo: true, repeat: -1 });
            } else {
                // Fail Smoke
                const smoke = document.createElement("div");
                Object.assign(smoke.style, {
                    width: "40px", height: "40px", background: "#718096", borderRadius: "50%",
                    position: "absolute", top: "40%", left: "50%", opacity: 0.8
                });
                this.container.appendChild(smoke);
                gsap.to(smoke, { y: -100, opacity: 0, duration: 2 });

                const msg = document.createElement("div");
                msg.innerText = "FAILURE: MISSING CORE COMPONENTS";
                Object.assign(msg.style, { position: "absolute", top: "20%", width: "100%", textAlign: "center", color: "#e53e3e", fontWeight: "bold" });
                this.container.appendChild(msg);
            }
        }
    }
}
