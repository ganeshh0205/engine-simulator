import * as THREE from "three";
import { generateBlade } from "../geometry/BladeGenerator.js";

export class Turbine extends THREE.Group {
  constructor(params = {}) {
    super();
    this.name = "Turbine";

    this.params = {
      stageLength: params.stageLength || 1.6,
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
    const { stageLength, hubRadius, tipRadius, bladeCount } = this.params;

    this.rotorMat = new THREE.MeshStandardMaterial({
      color: 0x888888, // Lighter alloy
      metalness: 0.6,  // Reduced from 0.8
      roughness: 0.4,  // Reduced from 0.5
      emissive: 0x111111, // Small base emission to prevent total blackout
      emissiveIntensity: 1.0
    });

    /* =======================
       Shaft / hub
    ======================= */
    const hubGeo = new THREE.CylinderGeometry(
      hubRadius,
      hubRadius,
      stageLength,
      32
    );
    const hub = new THREE.Mesh(hubGeo, this.rotorMat);
    hub.rotation.z = -Math.PI / 2;
    hub.position.x = stageLength / 2;
    this.rotorGroup.add(hub);

    /* =======================
       Rotor blades
    ======================= */
    const bladeGeo = generateBlade({
      height: tipRadius - hubRadius,
      chord: 0.26,
      thickness: 0.045,
      twistDeg: -22, // opposite twist vs compressor
    });

    // STATORS (Fixed) - Define BEFORE loop
    // High Temp Stators (Uniform Silver look)
    const statorMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.4,
      roughness: 0.7
    });

    const statorGeo = generateBlade({
      height: tipRadius - hubRadius,
      chord: 0.22,
      thickness: 0.04,
      twistDeg: 10,
    });

    // Multi-stage loop
    const stageCount = this.params.stageCount || 2;
    const totalLength = this.params.stageLength;
    const lengthPerStage = totalLength / stageCount;

    for (let s = 0; s < stageCount; s++) {
      const stageOffset = s * lengthPerStage;

      // ROTORS
      const rotorX = stageOffset + lengthPerStage * 0.3;

      const stageRotorGroup = new THREE.Group();
      stageRotorGroup.name = `TurbineRotorStage${s + 1}`; // Named Stage Group
      stageRotorGroup.position.set(rotorX, 0, 0);
      this.rotorGroup.add(stageRotorGroup);

      for (let i = 0; i < bladeCount; i++) {
        const blade = new THREE.Mesh(bladeGeo, this.rotorMat);
        const theta = (i / bladeCount) * Math.PI * 2;

        // Position relative to Group (local 0,0,0 is rotorX)
        blade.position.y = Math.cos(theta) * hubRadius;
        blade.position.z = Math.sin(theta) * hubRadius;
        blade.position.x = 0;

        blade.rotation.x = theta;
        blade.rotation.y = -0.5;

        blade.name = `TurbineRotorBlade_S${s}_${i}`;
        stageRotorGroup.add(blade);
      }

      // STATORS
      const statorX = stageOffset + lengthPerStage * 0.7;

      const stageStatorGroup = new THREE.Group();
      stageStatorGroup.name = `TurbineStatorStage${s + 1}`; // TurbineStatorStage1, 2...
      stageStatorGroup.position.set(statorX, 0, 0);
      this.add(stageStatorGroup);

      for (let j = 0; j < bladeCount; j++) {
        // Use 'j' instead of 'i' to avoid conflict if 'i' was used in rotor loop scope (safeguard)
        const vane = new THREE.Mesh(statorGeo, statorMat);
        const theta = (j / bladeCount) * Math.PI * 2;

        // Position relative to Group (local 0,0,0 is statorX)
        vane.position.y = Math.cos(theta) * hubRadius;
        vane.position.z = Math.sin(theta) * hubRadius;
        vane.position.x = 0;

        vane.rotation.x = theta;
        vane.rotation.y = 0.5;

        // Name not strictly needed for logic but good for debug
        vane.name = `Vane_${j}`;
        stageStatorGroup.add(vane);
      }
    }



    // STATORS logic now integrated into Multi-Stage loop above.

    /* =======================
       Casing (Thick Walled)
    ======================= */
    const rIn = 0.93; // Inner flow path
    const rOut = 1.0; // Standard Outer Skin
    const casingPoints = [
      new THREE.Vector2(rIn, 0),
      new THREE.Vector2(rOut, 0),
      new THREE.Vector2(rOut, stageLength),
      new THREE.Vector2(rIn, stageLength),
      new THREE.Vector2(rIn, 0)
    ];
    const casingGeo = new THREE.LatheGeometry(casingPoints, 64);

    // Unified Casing Material
    const casingMat = new THREE.MeshStandardMaterial({
      color: 0xa0a0a0,
      metalness: 0.5,
      roughness: 0.4,
      transparent: true,
      opacity: 0.2, // Unified
      side: THREE.FrontSide, // Solid
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
