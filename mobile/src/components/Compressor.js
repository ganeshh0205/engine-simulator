import * as THREE from "three";
import { generateBlade } from "../geometry/BladeGenerator.js";
import { BladeGenerator } from "../geometry/BladeGenerator.js";

export class Compressor extends THREE.Group {
  constructor(params = {}) {
    super();
    this.name = "Compressor";

    this.params = {
      length: params.length || 3.5,
      casingRadius: params.casingRadius || 1.0,
      inletHubRadius: 0.35,
      exitHubRadius: 0.82,
      stageCount: params.stageCount || 4,
      bladeColor: 0xcccccc,
      rpm: params.rpm || 6000
    };

    // Group for rotating parts
    this.rotorGroup = new THREE.Group();
    this.add(this.rotorGroup);

    this.build();
    this.length = this.params.length;
  }

  build() {
    const { casingRadius, inletHubRadius, exitHubRadius, bladeColor } = this.params;

    // Config
    const lpcCount = 4;
    const hpcCount = 10;

    const lpcSpacing = 0.5;
    const transitionLen = 0.5; // "The curvy is extended into an increasing frustrum"
    const hpcSpacing = 0.25;

    const lpcSectionLen = lpcCount * lpcSpacing;
    const hpcSectionLen = hpcCount * hpcSpacing;

    // Total Length
    const totalLength = lpcSectionLen + transitionLen + hpcSectionLen;
    this.length = totalLength;

    // Radius Definition
    const rLPC_Start = 0.35; // Start small (Tall blades)
    const rLPC_End = 0.58;   // End larger (Matches HPC)
    const rHPC = 0.58;       // Constant (Tall blades 0.42m)

    // ===========================
    // 1. ROTATING HUB (Complex Shape)
    // ===========================
    // Points for Lathe: [Spinner] -> [LPC Cylinder Taper] -> [Transition] -> [HPC Cylinder]
    const hubPoints = [];

    // A. Spinner Part (x < 0)
    const spinnerLen = 1.2;
    const numSpin = 24;

    // Spinner (x: -1.2 -> 0, r: 0 -> rLPC_Start)
    for (let i = 0; i <= numSpin; i++) {
      const t = i / numSpin;
      const x = -spinnerLen * (1 - t);
      const r = rLPC_Start * Math.pow(t, 0.4);
      hubPoints.push(new THREE.Vector2(r, x));
    }

    // B. LPC Taper Part (x: 0 -> lpcSectionLen, r: rLPC_Start -> rLPC_End)
    hubPoints.push(new THREE.Vector2(rLPC_Start, 0));
    hubPoints.push(new THREE.Vector2(rLPC_End, lpcSectionLen));

    // C. Transition Part (Frustum) (x: lpcSectionLen -> +transitionLen)
    // Connects LPC End to HPC Start (No jump if equal)
    hubPoints.push(new THREE.Vector2(rHPC, lpcSectionLen + transitionLen));

    // D. HPC Cylinder Part (x: -> end)
    hubPoints.push(new THREE.Vector2(rHPC, totalLength));
    // Close Back
    hubPoints.push(new THREE.Vector2(0.2, totalLength));

    const hubGeo = new THREE.LatheGeometry(hubPoints, 48);
    hubGeo.rotateZ(-Math.PI / 2);

    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x8f949a,
      metalness: 0.6,
      roughness: 0.4
    });

    const mainHub = new THREE.Mesh(hubGeo, hubMat);
    mainHub.name = "MainRotorHub";
    this.rotorGroup.add(mainHub);

    // ===========================
    // 2. CASING (Outer Skin)
    // ===========================
    const outerR = casingRadius + 0.05;
    const casingPoints = [
      new THREE.Vector2(casingRadius, -0.5),
      new THREE.Vector2(outerR, -0.5),
      new THREE.Vector2(outerR, totalLength),
      new THREE.Vector2(casingRadius, totalLength),
      new THREE.Vector2(casingRadius, -0.5)
    ];
    const casingGeo = new THREE.LatheGeometry(casingPoints, 32);
    casingGeo.rotateZ(-Math.PI / 2);

    const casingMat = new THREE.MeshStandardMaterial({
      color: 0xa0a0a0,
      metalness: 0.5,
      roughness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
      depthWrite: false, // Allow particles to be seen inside
    });

    const casing = new THREE.Mesh(casingGeo, casingMat);
    casing.name = "CompressorCasing";
    this.add(casing);

    // ===========================
    // 3. BLADES (LPC & HPC Zones)
    // ===========================
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.7, roughness: 0.3 });
    const statorMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.5, roughness: 0.5 });

    // Helper to build stage
    const addStage = (x, hubR, bladeCount, isLPC) => {
      // Blade Height = Casing - Hub - Clearance
      const bladeH = casingRadius - hubR - 0.03;

      // A. ROTOR
      let rotGeo;
      try {
        if (BladeGenerator && BladeGenerator.createRotor) {
          rotGeo = BladeGenerator.createRotor({
            radius: casingRadius - 0.02,
            hubRadius: hubR,
            count: bladeCount,
            length: (isLPC ? lpcSpacing : hpcSpacing) * 0.4,
            twist: isLPC ? 0.6 : 0.3
          });
        } else throw "NoGen";
      } catch (e) { rotGeo = new THREE.BoxGeometry(0.1, bladeH, 0.1); }

      const rGrp = new THREE.Group();
      rGrp.name = "RotorStage";
      rGrp.position.set(x, 0, 0);
      this.rotorGroup.add(rGrp);

      for (let i = 0; i < bladeCount; i++) {
        const theta = (i / bladeCount) * Math.PI * 2;
        const b = new THREE.Mesh(rotGeo, rotorMat);
        b.name = "RotorBlade";
        b.position.set(0, Math.cos(theta) * hubR, Math.sin(theta) * hubR);
        b.rotation.x = theta;
        b.rotation.y = 0.4;
        rGrp.add(b);
      }

      // B. STATOR
      const statorHubR = hubR + 0.04;
      let statGeo;
      try {
        if (BladeGenerator && BladeGenerator.createStator) {
          statGeo = BladeGenerator.createStator({
            radius: casingRadius,
            hubRadius: statorHubR,
            count: bladeCount + 5,
            length: (isLPC ? lpcSpacing : hpcSpacing) * 0.3
          });
        } else throw "NoGen";
      } catch (e) { statGeo = new THREE.BoxGeometry(0.1, casingRadius - statorHubR, 0.1); }

      const sGrp = new THREE.Group();
      sGrp.name = "StatorStage";
      sGrp.position.set(x + (isLPC ? lpcSpacing : hpcSpacing) * 0.5, 0, 0);
      this.add(sGrp);

      for (let i = 0; i < bladeCount + 5; i++) {
        const theta = (i / (bladeCount + 5)) * Math.PI * 2;
        const s = new THREE.Mesh(statGeo, statorMat);
        s.name = "StatorVane";
        s.position.set(0, Math.cos(theta) * statorHubR, Math.sin(theta) * statorHubR);
        s.rotation.x = theta;
        s.rotation.y = -0.4;
        sGrp.add(s);
      }
    };

    // Build LPC Stages (On Tapering Cylinder)
    for (let i = 0; i < lpcCount; i++) {
      const x = i * lpcSpacing + lpcSpacing * 0.2;
      // Interpolate Hub Radius
      const t = i / (lpcCount - 1);
      const currentR = rLPC_Start + t * (rLPC_End - rLPC_Start);
      addStage(x, currentR, 24, true);
    }

    // Build HPC Stages (On Large Constant Cylinder)
    const hpcStart = lpcSectionLen + transitionLen;
    for (let i = 0; i < hpcCount; i++) {
      const x = hpcStart + i * hpcSpacing + hpcSpacing * 0.2;
      addStage(x, rHPC, 42, false);
    }
  }

  update(dt) {
    const omega = (this.params.rpm * 2 * Math.PI) / 60;
    this.rotorGroup.rotation.x += omega * dt;
  }
}
