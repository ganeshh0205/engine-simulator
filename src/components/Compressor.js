import * as THREE from "three";
import { generateBlade } from "../geometry/BladeGenerator.js";
import { BladeGenerator } from "../geometry/BladeGenerator.js"; // Ensure we import the class if used, or function

export class Compressor extends THREE.Group {
  constructor(params = {}) {
    super();
    this.name = "Compressor";

    this.params = {
      length: params.length || 3.5, // 4 Stages
      casingRadius: params.casingRadius || 1.0,
      inletHubRadius: 0.45,
      exitHubRadius: 0.82,
      stageCount: params.stageCount || 4, // 4 Stages
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
    const { length, casingRadius, inletHubRadius, exitHubRadius, stageCount, bladeColor } = this.params;
    const spacing = length / stageCount;

    // ===========================
    // 1. CASING (Thick Wall)
    // ===========================
    const wallThickness = 0.07;
    const outerR = casingRadius + wallThickness;
    const casingPoints = [
      new THREE.Vector2(casingRadius, 0),
      new THREE.Vector2(outerR, 0),
      new THREE.Vector2(outerR, length),
      new THREE.Vector2(casingRadius, length),
      new THREE.Vector2(casingRadius, 0)
    ];
    // Rotate -90 aligned
    const casingGeo = new THREE.LatheGeometry(casingPoints, 32);
    casingGeo.rotateZ(-Math.PI / 2);

    const casingMat = new THREE.MeshStandardMaterial({
      color: 0xa0a0a0,
      metalness: 0.5,
      roughness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2 // See-through default
    });

    const casing = new THREE.Mesh(casingGeo, casingMat);
    casing.name = "CompressorCasing";
    this.add(casing);

    // ===========================
    // 2. MATERIALS
    // ===========================
    const rotorMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc, // Silver Blade
      metalness: 0.5,
      roughness: 0.5
    });
    const statorMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa, // Silver Stator
      metalness: 0.4,
      roughness: 0.6
    });
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x8f949a,
      metalness: 0.5,
      roughness: 0.5
    });

    // ===========================
    // 3. SPINNER (Nose Cone)
    // ===========================
    const spinnerHeight = 1.0;
    const spinnerPoints = [];
    const numPoints = 20;
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints; // 0 to 1
      // x goes from -spinnerHeight to 0
      const x = -spinnerHeight * (1 - t);
      // r goes from 0 to inletHubRadius (Ogive)
      const r = inletHubRadius * Math.sin(t * Math.PI / 2);
      spinnerPoints.push(new THREE.Vector2(r, x));
    }
    const spinnerGeo = new THREE.LatheGeometry(spinnerPoints, 32);
    spinnerGeo.rotateZ(-Math.PI / 2);

    const spinner = new THREE.Mesh(spinnerGeo, hubMat);
    spinner.name = "Spinner";
    this.rotorGroup.add(spinner);

    // ===========================
    // 4. STAGES (Rotor + Stator)
    // ===========================
    for (let i = 0; i < stageCount; i++) {
      const xPos = i * spacing;

      // Interpolate Hub Radius for this stage segment
      // x goes from i*spacing to (i+1)*spacing
      const tStart = i / stageCount;
      const tEnd = (i + 1) / stageCount;

      const rStart = inletHubRadius + (exitHubRadius - inletHubRadius) * tStart;
      const rEnd = inletHubRadius + (exitHubRadius - inletHubRadius) * tEnd;

      // Hub Segment (Conical/Frustum to make it smooth, not stepped)
      // Top=rEnd (X+), Bottom=rStart (X-)
      const segGeo = new THREE.CylinderGeometry(rEnd, rStart, spacing, 32);
      segGeo.rotateZ(-Math.PI / 2);
      const seg = new THREE.Mesh(segGeo, hubMat);
      seg.position.set(xPos + spacing / 2, 0, 0);
      this.rotorGroup.add(seg);

      // A. ROTOR
      // Calculate radius specifically at the Rotor's X position
      // Rotor is at 0.25 of the spacing
      const tRotor = (i + 0.25) / stageCount;
      const rRotor = inletHubRadius + (exitHubRadius - inletHubRadius) * tRotor;

      // Blade Geometry
      const bladeHeight = casingRadius - rRotor - 0.02;

      // Generate Single Blade Geometry (re-used)
      let rotorGeo;
      try {
        rotorGeo = BladeGenerator.createRotor({
          radius: casingRadius - 0.02,
          hubRadius: rRotor,
          count: 32,
          length: spacing * 0.4,
          twist: 0.5
        });
      } catch (e) {
        rotorGeo = new THREE.BoxGeometry(0.1, bladeHeight, 0.3);
      }

      const stageRotorGroup = new THREE.Group();
      stageRotorGroup.position.set(xPos + spacing * 0.25, 0, 0);
      stageRotorGroup.name = `RotorStage${i + 1}`;
      this.rotorGroup.add(stageRotorGroup);

      // Loop to place blades radially
      const numBlades = 32;
      for (let b = 0; b < numBlades; b++) {
        const theta = (b / numBlades) * Math.PI * 2;
        const blade = new THREE.Mesh(rotorGeo, rotorMat);

        blade.position.y = Math.cos(theta) * rRotor;
        blade.position.z = Math.sin(theta) * rRotor;
        blade.rotation.x = theta; // Radial
        blade.rotation.y = 0.4;   // AoA

        blade.name = `CompressorBlade_S${i}_B${b}`;
        stageRotorGroup.add(blade);
      }

      // C. STATOR
      // Calculate radius at Stator position (0.75)
      const tStator = (i + 0.75) / stageCount;
      const rStator = inletHubRadius + (exitHubRadius - inletHubRadius) * tStator;

      let statorGeo;
      try {
        statorGeo = BladeGenerator.createStator({
          radius: casingRadius,
          hubRadius: rStator,
          count: 36,
          length: spacing * 0.3
        });
      } catch (e) {
        statorGeo = new THREE.BoxGeometry(0.1, casingRadius - rStator, 0.2);
      }

      const stageStatorGroup = new THREE.Group();
      stageStatorGroup.name = `StatorStage${i + 1}`;
      // Stators base X is fixed at spacing * 0.75 relative to stage start
      stageStatorGroup.position.set(xPos + spacing * 0.75, 0, 0);
      this.add(stageStatorGroup);

      const numStators = 36;
      for (let b = 0; b < numStators; b++) {
        const theta = (b / numStators) * Math.PI * 2;
        const vane = new THREE.Mesh(statorGeo, statorMat);

        vane.position.y = Math.cos(theta) * rStator;
        vane.position.z = Math.sin(theta) * rStator;
        // Position is now relative to group (which is at xPos + spacing*0.75)
        vane.position.x = 0;

        vane.rotation.x = theta;
        vane.rotation.y = -0.4;

        vane.name = `CompressorVane_S${i}_B${b}`;

        stageStatorGroup.add(vane);
      }
    }
  }

  update(dt) {
    const omega = (this.params.rpm * 2 * Math.PI) / 60;
    this.rotorGroup.rotation.x += omega * dt;
  }
}
