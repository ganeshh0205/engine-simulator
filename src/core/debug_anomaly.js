
import { PhysicsEngine } from './PhysicsEngine.js';

const debug = () => {
    console.log("=== DEBUG ANOMALY: 20% THROTTLE ===");
    const eng = new PhysicsEngine();

    // Set 20% Throttle
    eng.inputs.ignition = true;
    eng.inputs.throttle = 20.0;
    eng.inputs.altitude = 0;
    eng.inputs.mach = 0.0;

    // Run for 10 seconds to stabilize
    // Dynamics: 20% Throttle -> Target RPM = 60 + (0.2)*(40) = 68%
    console.log("Running simulation...");
    for (let i = 0; i < 500; i++) {
        eng.update(0.02);
    }

    const s = eng.state;
    console.log(`\nFINAL STATE:`);
    console.log(`Throttle: 20.0%`);
    console.log(`RPM (N1): ${s.rpm.toFixed(3)} % (Expected ~68%)`);
    console.log(`Thrust: ${(s.thrust / 1000).toFixed(4)} kN`);
    console.log(`Thrust (Raw): ${s.thrust.toFixed(2)} N`);

    console.log(`\n--- INTERMEDIALS ---`);
    console.log(`Mass Flow: ${eng.debug_ma?.toFixed(3) || "N/A"} kg/s (Calc from N1)`);
    console.log(`Comp PR: ${eng.debug_pr?.toFixed(3) || "N/A"}`);
    console.log(`P3: ${s.p3.toFixed(1)} Pa`);
    console.log(`T4: ${s.t4.toFixed(1)} K`);
    console.log(`T5: ${s.egt.toFixed(1)} K`);
    console.log(`Vj: ${s.exitVelocity.toFixed(1)} m/s`);

    console.log("\nIf Thrust is 9800 N, then MassFlow * Vj must be high.");
};

// Patch PhysicsEngine to expose debug if needed, or just read state
// Since I can't easily patch the class method from outside without modifying file, 
// I will rely on the state values I added (p3, t4, etc).
// Note: debug_ma is not in state. I might need to calculate it here to check.
// m_a = 12.0 * N1 * ...

debug();
