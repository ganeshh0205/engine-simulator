
import { PhysicsEngine } from './PhysicsEngine.js';

const runTest = async () => {
    console.log("=== PHYSICS VERIFICATION SUITE ===");
    const engine = new PhysicsEngine();

    // Helper to stabilize engine
    const runForSeconds = (dt, duration) => {
        const steps = duration / dt;
        for (let i = 0; i < steps; i++) engine.update(dt);
    };

    console.log("\n--- TEST CASE 1: START & IDLE ---");
    // Start Engine
    engine.inputs.ignition = true;
    engine.inputs.throttle = 0.0; // Seek Idle

    // Run for 15 seconds to spool up
    runForSeconds(0.02, 15.0);

    let s = engine.state;
    console.log(`RPM: ${s.rpm.toFixed(1)}% (Expected ~60%)`);
    console.log(`EGT: ${s.egt.toFixed(0)}K`);
    console.log(`TSFC: ${s.tsfc.toFixed(2)}`);
    console.log(`THR: ${(s.thrust / 1000).toFixed(2)} kN`);

    console.log("\n--- TEST CASE 2: MAX POWER (SLS) ---");
    engine.inputs.throttle = 100.0;
    runForSeconds(0.02, 10.0); // Spool up

    s = engine.state;
    console.log(`RPM: ${s.rpm.toFixed(1)}%`);
    console.log(`P3: ${(s.p3 / 1000).toFixed(1)} kPa (Expected ~900-1000)`);
    console.log(`T4: ${s.t4.toFixed(0)} K`);
    console.log(`EGT: ${s.egt.toFixed(0)} K`);
    console.log(`THR: ${(s.thrust / 1000).toFixed(2)} kN (Expected ~2.5 - 3.2)`);
    console.log(`TSFC: ${s.tsfc.toFixed(2)} (Expected ~1.2)`);

    console.log("\n--- TEST CASE 3: ALTITUDE CRUISE (30k ft, 0.8M) ---");
    engine.inputs.altitude = 30000;
    engine.inputs.mach = 0.8;
    // Note: Cycle takes constant P0 from input immediately on update
    runForSeconds(0.02, 2.0); // Stabilize

    s = engine.state;
    console.log(`Alt: ${engine.inputs.altitude} ft`);
    console.log(`P0: ${(engine.inputs.ambientPress / 1000).toFixed(2)} kPa`);
    console.log(`T0: ${engine.inputs.ambientTemp.toFixed(1)} K`);
    console.log(`THR: ${(s.thrust / 1000).toFixed(2)} kN (Should be lower than SLS)`);
    console.log(`TSFC: ${s.tsfc.toFixed(2)} (Might improve or degrade based on efficiency curves)`);

    console.log("\n--- TEST CASE 4: MANUAL OVERRIDE ---");
    engine.inputs.manualAtmosphere = true;
    engine.inputs.ambientPress = 50000; // ~18k ft
    engine.inputs.ambientTemp = 250;
    runForSeconds(0.02, 1.0);

    s = engine.state;
    console.log(`P0 (Manual): ${engine.inputs.ambientPress}`);
    console.log(`THR: ${(s.thrust / 1000).toFixed(2)} kN`);
};

runTest();
