import * as THREE from "three";
import { Intake } from "../components/Intake.js";
import { Compressor } from "../components/Compressor.js";
import { Combustor } from "../components/Combustor.js";
import { Turbine } from "../components/Turbine.js";
import { Nozzle } from "../components/Nozzle.js";
import { Accessories } from "../components/Accessories.js"; // New

export class EngineFactory {
  static createTurbojet() {
    const engine = new THREE.Group();
    engine.name = "TurbojetEngine";

    let cursorX = 0;

    const components = [
      new Intake({ length: 1.1 }), // Shortened Nacelle (Flush Spinner)
      // LENGTH FIX: Internal geometry is 5.0m long (LPC 2.0 + Trans 0.5 + HPC 2.5).
      new Compressor({ length: 5.0, stageCount: 4 }), // 4 Stages passed, but builds internal structure
      // DIAMETER FIX: Diffuser reduces from 0.58 (Compressor Hub) to 0.45 (Combustor Inner)
      // LENGTH FIX: Restoring size after adding diffuser (2.0 -> 2.8)
      new Combustor({ length: 2.8, innerRadius: 0.45, inletRadius: 0.58 }),
      new Turbine({ length: 3.2, stageCount: 4 }),    // EXTENDED: 4 Stages, 3.2m length
      new Nozzle({ length: 2.0 }),
    ];

    components.forEach((component) => {
      // 🔑 CRITICAL FIX: Position at cursor (pivot is now at start of component)
      component.position.x = cursorX;

      engine.add(component);

      // advance cursor to end of this component
      cursorX += component.length;
    });

    // Add Accessories (Gearbox) - positioned under Compressor
    // Compressor starts at 1.5. Length 3.5. Center ~ 1.5 + 1.75 = 3.25
    const gearbox = new Accessories();
    gearbox.position.x = 3.25;
    engine.add(gearbox);

    engine.totalLength = cursorX;
    return engine;
  }

  static createRamjet() {
    const engine = new THREE.Group();
    engine.name = "RamjetEngine";

    let cursorX = 0;
    // Ramjet: Intake -> Combustor -> Nozzle (No rotating parts)
    const components = [
      new Intake({ length: 2.5, radius: 0.9, color: 0x888888 }), // Long Spike Intake
      new Combustor({ length: 3.0, radius: 0.9 }),
      new Nozzle({ length: 2.0, radius: 0.8 })
    ];

    components.forEach((c) => {
      c.position.x = cursorX;
      engine.add(c);
      cursorX += c.length;
    });
    engine.totalLength = cursorX;
    return engine;
  }

  static createRocket() {
    const engine = new THREE.Group();
    engine.name = "RocketEngine";

    let cursorX = 0;
    // Rocket: Tank (as Intake placeholder?) -> Pump/Chamber -> Nozzle
    // We reuse Intake geometry as Fuel Tank for now
    const components = [
      new Intake({ length: 4.0, radius: 1.2, color: 0xeeeeee }), // Fuel Tank
      new Combustor({ length: 1.0, radius: 1.0 }), // Chamber
      new Nozzle({ length: 1.5, radius: 1.5, endRadius: 2.5 }) // Bell Nozzle (Large exit)
    ];
    components.forEach((c) => {
      c.position.x = cursorX;
      engine.add(c);
      cursorX += c.length;
    });
    engine.totalLength = cursorX;
    return engine;
  }

  static createTurbofan() {
    const engine = new THREE.Group();
    engine.name = "TurbofanEngine";

    let cursorX = 0;

    const components = [
      new Intake({ length: 1.5, radius: 1.8 }), // Large Inlet
      new Compressor({ length: 0.8, stageCount: 1, casingRadius: 1.8, bladeColor: 0x222222 }), // The FAN
      new Compressor({ length: 3.0, stageCount: 3, casingRadius: 1.0 }), // Core Compressor (Smaller)
      new Combustor({ length: 2.0, radius: 1.0 }),
      new Turbine({ length: 2.4, stageCount: 4, radius: 1.0 }), // Driving Fan + Comp
      new Nozzle({ length: 2.0, radius: 0.8 }),
    ];

    components.forEach((component) => {
      component.position.x = cursorX;
      engine.add(component);
      cursorX += component.length;
    });

    // Add Spinner to Fan? (Already in compressor?)

    engine.totalLength = cursorX;
    return engine;
  }
}
