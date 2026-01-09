import * as THREE from "three";
import { generateBlade } from "../geometry/BladeGenerator.js";

export class Turbine extends THREE.Group {
  constructor(params = {}) {
    super();
    this.name = "Turbine";

    this.params = {
      stageLength: params.length || params.stageLength || 1.6, // Prioritize 'length' from Factory
      stageCount: params.stageCount || 3, // 2-Stage Turbine
      hubRadius: params.hubRadius || 0.45, // Standard Hub
      tipRadius: params.tipRadius || 0.92,  // Slightly clearer of casing (1.0)
      casingRadius: 1.0, // Explicit Standard
      bladeCount: params.bladeCount || 42, // Higher density for Turbine
      rpm: params.rpm || 5200,
    };

    this.rotorGroup = new THREE.Group();
    this.rotorGroup.name = "RotorGroup";
    this.add(this.rotorGroup);
    this.length = this.params.stageLength;

    this.build();
  }

  build() {
    const { stageLength, stageCount, bladeCount, hubRadius } = this.params;

    // Frustum Parameters: Start tight, expand outwards
    // Entry: Match Combustor (approx 1.0)
    // Exit: Expand (approx 1.25)
    // Hub: Constant or shrinking? Constant is easier for now.

    const rStart = 1.0;
    const rEnd = 1.55; // Increased from 1.25 for wider opening

    // HUB Frustum: Also expand relative to casing
    const hStart = hubRadius;
    const hEnd = hubRadius * 1.55; // Expand hub proportionately

    this.rotorMat = new THREE.MeshStandardMaterial({
      color: 0x888888, // Lighter alloy
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0x111111,
      emissiveIntensity: 1.0
    });

    /* =======================
       Shaft / hub (Now Conical)
    ======================= */
    // CylinderGeometry(radiusTop, radiusBottom, height, ...)
    // ROTATED -90 deg Z: Bottom is Left (Start), Top is Right (End)
    const hubGeo = new THREE.CylinderGeometry(
      hEnd,   // Top (Right/End)
      hStart, // Bottom (Left/Start)
      stageLength,
      32
    );
    const hub = new THREE.Mesh(hubGeo, this.rotorMat);
    hub.rotation.z = -Math.PI / 2;
    hub.position.x = stageLength / 2;
    this.rotorGroup.add(hub);

    // STATORS (Fixed) Material
    const statorMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.4,
      roughness: 0.7
    });

    // Multi-stage loop with Tapering
    const lengthPerStage = stageLength / stageCount;

    for (let s = 0; s < stageCount; s++) {
      const stageOffset = s * lengthPerStage;

      // Interpolate Tip and Hub Radius for Conic Shape
      // We evaluate at the MIDDLE of the stage for simplicity
      const t = (s + 0.5) / stageCount;
      const currentTipR = rStart + (rEnd - rStart) * t;
      const currentHubR = hStart + (hEnd - hStart) * t;

      const bladeHeight = currentTipR - currentHubR;

      // 1. ROTOR BLADES (Custom Geo per stage due to height change)
      const bladeGeo = generateBlade({
        height: bladeHeight,
        chord: 0.28 + (s * 0.05), // Blades get wider/larger
        thickness: 0.045,
        twistDeg: -22,
      });

      const rotorX = stageOffset + lengthPerStage * 0.3;
      const stageRotorGroup = new THREE.Group();
      stageRotorGroup.name = `TurbineRotorStage${s + 1}`;
      stageRotorGroup.position.set(rotorX, 0, 0);
      this.rotorGroup.add(stageRotorGroup);

      for (let i = 0; i < bladeCount; i++) {
        const blade = new THREE.Mesh(bladeGeo, this.rotorMat);
        const theta = (i / bladeCount) * Math.PI * 2;
        // Attach at Current Hub Radius
        blade.position.y = Math.cos(theta) * currentHubR;
        blade.position.z = Math.sin(theta) * currentHubR;
        blade.position.x = 0;
        blade.rotation.x = theta;
        blade.rotation.y = -0.5;
        blade.name = `TurbineRotorBlade_S${s}_${i}`;
        stageRotorGroup.add(blade);
      }

      // 2. STATOR VANES (Fixed)
      // Stators sit slightly aft, interpolate again or approx same?
      // Let's use same R for simplicity of stage visual
      const statorGeo = generateBlade({
        height: bladeHeight, // Approx same height as rotor in same stage
        chord: 0.24,
        thickness: 0.04,
        twistDeg: 10,
      });

      const statorX = stageOffset + lengthPerStage * 0.7;
      const stageStatorGroup = new THREE.Group();
      stageStatorGroup.name = `TurbineStatorStage${s + 1}`;
      stageStatorGroup.position.set(statorX, 0, 0);
      this.add(stageStatorGroup);

      for (let j = 0; j < bladeCount; j++) {
        const vane = new THREE.Mesh(statorGeo, statorMat);
        const theta = (j / bladeCount) * Math.PI * 2;
        vane.position.y = Math.cos(theta) * currentHubR;
        vane.position.z = Math.sin(theta) * currentHubR;
        vane.position.x = 0;
        vane.rotation.x = theta;
        vane.rotation.y = 0.5;
        stageStatorGroup.add(vane);
      }
    }

    /* =======================
       Casing (Increasing Frustum)
    ======================= */
    // Lathe Profile: Line from (rStart, 0) to (rEnd, Length)
    const points = [
      new THREE.Vector2(rStart, 0),
      new THREE.Vector2(rStart + 0.1, 0), // Thickness
      new THREE.Vector2(rEnd + 0.1, stageLength),
      new THREE.Vector2(rEnd, stageLength),
      new THREE.Vector2(rStart, 0) // Closed loop
    ];

    const casingGeo = new THREE.LatheGeometry(points, 64);

    const casingMat = new THREE.MeshStandardMaterial({
      color: 0xa0a0a0,
      metalness: 0.5,
      roughness: 0.4,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const casing = new THREE.Mesh(casingGeo, casingMat);
    casing.rotation.z = -Math.PI / 2;
    casing.name = "TurbineCasing";
    this.add(casing);
  }

  update(dt) {
    const omega = (this.params.rpm * 2 * Math.PI) / 60;
    this.rotorGroup.rotation.x += omega * dt;
  }
}
