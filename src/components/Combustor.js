import * as THREE from "three";
import { TextureUtils } from "../utils/TextureUtils.js";
import { FuelSpraySystem } from "../effects/FuelSpraySystem.js";
import { IgnitionSpark } from "../effects/IgnitionSpark.js";
import { CombustionShader } from "../effects/FlameShader.js";

export class Combustor extends THREE.Group {
  constructor(params = {}) {
    super();
    this.name = "Combustor";
    // ... (rest is same)
    this.params = {
      length: params.length || 2.0,
      innerRadius: params.innerRadius || 0.45,
      outerRadius: params.outerRadius || 1.0,
    };

    this.build();
    this.length = this.params.length;
  }
  // ...
  initEffects(midRadius, linerOffset, linerLen) {
    // A. FUEL SPRAY
    const injectorCount = 16;
    const positions = [];
    const normals = [];

    for (let i = 0; i < injectorCount; i++) {
      const theta = (i / injectorCount) * Math.PI * 2;
      const y = Math.cos(theta) * midRadius;
      const z = Math.sin(theta) * midRadius;
      positions.push(new THREE.Vector3(linerOffset + 0.05, y, z)); // Inside Dome
      normals.push(new THREE.Vector3(1, 0, 0)); // Backward
    }

    this.fuelSpray = new FuelSpraySystem(injectorCount, positions, normals);
    this.fuelSpray.visible = false;
    this.add(this.fuelSpray);

    // B. IGNITION SPARKS
    // 2 Locations
    const sparkPos = [];
    const plugAngles = [Math.PI * 0.3, Math.PI * 1.7];
    const sparkDist = midRadius; // Inside liner

    plugAngles.forEach(theta => {
      const y = Math.cos(theta) * sparkDist;
      const z = Math.sin(theta) * sparkDist;
      sparkPos.push(new THREE.Vector3(linerOffset + linerLen * 0.3, y, z));
    });

    this.ignitionSpark = new IgnitionSpark(sparkPos);
    this.add(this.ignitionSpark);

    // C. VOLUMETRIC FLAME
    // Cylinder fitting inside Liner
    // Inner R ~0.5, Outer ~0.9. Radius ~0.7?
    // Shader handles volume noise.
    // Geometry: Cylinder
    const flameGeo = new THREE.CylinderGeometry(midRadius + 0.1, midRadius + 0.05, linerLen * 0.9, 32, 1, true);
    flameGeo.rotateZ(-Math.PI / 2);
    flameGeo.translate(linerOffset + linerLen / 2, 0, 0); // Center in liner

    const flameMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uThrottle: { value: 0 },
        uAFR: { value: 1.0 }
      },
      vertexShader: CombustionShader.vertexShader,
      fragmentShader: CombustionShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, // Glow
      blending: THREE.AdditiveBlending
    });

    this.flameMesh = new THREE.Mesh(flameGeo, flameMat);
    this.flameMesh.name = "CombustionFlames"; // For ViewManager check
    this.flameMesh.visible = false;
    this.add(this.flameMesh);
  }

  build() {
    const { length, innerRadius, inletRadius, outerRadius } = this.params;

    // Geometry Constants
    const diffuserLen = 0.5; // Short transition section
    const mainLen = length - diffuserLen;
    const shaftRadius = 0.18; // Central Shaft

    // ===========================
    // 0. CENTRAL DRIVE SHAFT
    // ===========================
    // Connects Compressor (front) to Turbine (back). Visible through transparent combustor.
    const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, length, 32);
    shaftGeo.rotateZ(-Math.PI / 2);

    // Dark steel material
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.4
    });

    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.x = length / 2;
    shaft.name = "CentralShaft";
    this.add(shaft);


    /* =======================
       1. Diffuser (Transition Frustum)
    ======================= */
    // Inner Wall: Tapers from inletRadius (Compressor Exit) -> shaftRadius (Central Rod)
    // This creates the "Cone" the user requested.

    const diffGeo = new THREE.CylinderGeometry(shaftRadius, inletRadius, diffuserLen, 48, 1, true);
    diffGeo.rotateZ(-Math.PI / 2);

    const diffMat = new THREE.MeshStandardMaterial({
      color: 0x999999,
      metalness: 0.6,
      roughness: 0.5,
      side: THREE.DoubleSide
    });

    const diffuser = new THREE.Mesh(diffGeo, diffMat);
    diffuser.position.x = diffuserLen / 2;
    diffuser.name = "DiffuserHub";
    this.add(diffuser);


    /* =======================
       2. (Legacy Burner Ring removed - Integrated into Annular Liner)
    ======================= */



    /* =======================
       3. Outer Casing (Transparent)
    ======================= */
    const casingGeo = new THREE.CylinderGeometry(outerRadius, outerRadius, length, 48, 1, true);
    casingGeo.rotateZ(-Math.PI / 2);

    const casingMat = new THREE.MeshStandardMaterial({
      color: 0xa0a0a0,
      metalness: 0.5,
      roughness: 0.4,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false, // Permit seeing particles inside
    });

    const casing = new THREE.Mesh(casingGeo, casingMat);
    casing.position.x = length / 2;
    casing.name = "CombustorCasing";
    this.add(casing);

    /* =======================
       4. Annular Combustor Liner
    ======================= */
    // Continuous Ring Design preferred for modern high-bypass engines

    const linerGroup = new THREE.Group();
    // Offset entire liner to start AFTER diffuser
    linerGroup.position.x = diffuserLen;

    const midRadius = (innerRadius + outerRadius) / 2;
    const linerThickness = (outerRadius - innerRadius) * 0.6; // Occupy 60% of gap
    const linerInnerR = midRadius - linerThickness / 2;
    const linerOuterR = midRadius + linerThickness / 2;

    const linerLen = mainLen * 0.95; // Maximize usage
    const linerOffset = 0.02; // Minimal offset to just clear the Diffuser weld

    // A. Outer Liner Wall (Optional now if we have cans, but keeping as 'Case')
    const outLinerGeo = new THREE.CylinderGeometry(linerOuterR, linerOuterR, linerLen, 48, 1, true);
    outLinerGeo.rotateZ(-Math.PI / 2);
    outLinerGeo.translate(linerOffset + linerLen / 2, 0, 0);

    // B. Inner Liner Wall
    const inLinerGeo = new THREE.CylinderGeometry(linerInnerR, linerInnerR, linerLen, 48, 1, true);
    inLinerGeo.rotateZ(-Math.PI / 2);
    inLinerGeo.translate(linerOffset + linerLen / 2, 0, 0);

    // C. Dome (Front Head)
    const domeGeo = new THREE.RingGeometry(linerInnerR, linerOuterR, 48);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.6,
      roughness: 0.5,
      side: THREE.DoubleSide
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.rotation.y = -Math.PI / 2;
    dome.position.x = linerOffset;
    linerGroup.add(dome);

    // Material for Liner (Perforated look)
    const perforatedTex = TextureUtils.createPerforatedMetalTexture();
    this.linerMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.5,
      roughness: 0.6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4, // Lower opacity to see Cans inside
      alphaMap: perforatedTex,
      alphaTest: 0.2,
      emissive: 0x000000
    });
    // Expose for heat glow
    this.linerMats = [this.linerMat];

    const outLiner = new THREE.Mesh(outLinerGeo, this.linerMat);
    const inLiner = new THREE.Mesh(inLinerGeo, this.linerMat);
    linerGroup.add(outLiner);
    linerGroup.add(inLiner);

    /* =======================
       4.5 COMBUSION CANS (NEW)
    ======================= */
    const canCount = 12; // Match Injectors
    const canRadius = (linerOuterR - linerInnerR) / 2 * 0.85;
    const canGeo = new THREE.CylinderGeometry(canRadius, canRadius, linerLen, 16, 1, true);
    canGeo.rotateZ(-Math.PI / 2); // Align X

    // Material for Cans (Solid, dark, glowing)
    const canMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.6,
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    this.linerMats.push(canMat); // Add to heat glow list

    for (let i = 0; i < canCount; i++) {
      const theta = (i / canCount) * Math.PI * 2;
      const can = new THREE.Mesh(canGeo, canMat);
      const cy = Math.cos(theta) * midRadius;
      const cz = Math.sin(theta) * midRadius;
      can.position.set(linerOffset + linerLen / 2, cy, cz);
      linerGroup.add(can);
    }

    this.add(linerGroup);

    /* =======================
       5. Fuel Injectors (Visible)
    ======================= */
    const injectorCount = 12; // MATCH CAN COUNT
    const injectorGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 16);
    injectorGeo.rotateZ(-Math.PI / 2); // Point X 

    const injectorMat = new THREE.MeshStandardMaterial({ color: 0x884400, metalness: 0.8, roughness: 0.3 }); // Copper/Bronzeish

    for (let i = 0; i < injectorCount; i++) {
      const theta = (i / injectorCount) * Math.PI * 2;
      const y = Math.cos(theta) * midRadius;
      const z = Math.sin(theta) * midRadius;

      const inj = new THREE.Mesh(injectorGeo, injectorMat);

      // FIX: Position Injectors INSIDE the Liner Dome
      // Absolute Dome X = diffuserLen + linerOffset (approx 0.5 + 0.4 = 0.9)
      const absDomeX = diffuserLen + linerOffset;

      inj.position.set(absDomeX + 0.1, y, z);
      this.add(inj);

      // Add a "Pipe" connection to casing
      const pipeGeo = new THREE.CylinderGeometry(0.015, 0.015, (outerRadius - midRadius) * 0.8, 8);
      const pipe = new THREE.Mesh(pipeGeo, injectorMat);
      // Pipe slightly behind injector
      pipe.position.set(absDomeX + 0.05, y * 1.2, z * 1.2);
      pipe.lookAt(absDomeX + 0.05, 0, 0);
      pipe.rotateX(Math.PI / 2);
      this.add(pipe);
    }

    /* =======================
       6. Ignition Plugs (Spark Plugs)
    ======================= */
    // Usually 2 plugs at ~4 o'clock and ~8 o'clock (120 and 240 deg?)
    // Let's place at indices 4 and 12 (approx)
    const plugAngles = [Math.PI * 0.3, Math.PI * 1.7]; // Just some arbitrary angles

    const plugGeo = new THREE.CylinderGeometry(0.04, 0.04, (outerRadius - linerOuterR) + 0.1, 16);
    const plugMat = new THREE.MeshStandardMaterial({ color: 0xffff00, metalness: 0.5, roughness: 0.2, emissive: 0x222200 }); // Yellowish standout

    plugAngles.forEach(theta => {
      const plug = new THREE.Mesh(plugGeo, plugMat);
      // Position sticking through Outer Casing into Annular Liner
      // Radial position
      const dist = (outerRadius + linerOuterR) / 2;

      // Orient radially
      plug.position.set(linerOffset + linerLen / 2, Math.cos(theta) * dist, Math.sin(theta) * dist);
      plug.lookAt(linerOffset + linerLen / 2, 0, 0);
      plug.rotateX(Math.PI / 2);

      this.add(plug);

      // Add a box on top for "Igniter Box" outside
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      box.position.copy(plug.position);
      // Move outwards along normal
      const n = plug.position.clone().normalize();
      box.position.add(n.multiplyScalar(0.15));
      box.lookAt(linerOffset + linerLen / 2, 0, 0);
      this.add(box);
    });

    // ===========================
    // 7. EFFECTS INTEGRATION
    // ===========================
    // Fix: Pass correct Z-offset to spawn effects INSIDE the Liner, not at the Diffuser
    // Diffuser is 0->diffuserLen. Liner starts at diffuserLen. Liner offset is internal to linerGroup.
    // Absolute X of Liner Start = diffuserLen + linerOffset.
    const effectsBaseZ = diffuserLen + linerOffset;

    this.initEffects(midRadius, linerLen, effectsBaseZ);
  }

  initEffects(midRadius, linerLen, baseZ) {
    // A. FUEL SPRAY
    const injectorCount = 12; // MATCH CAN COUNT
    const positions = [];
    const normals = [];

    for (let i = 0; i < injectorCount; i++) {
      const theta = (i / injectorCount) * Math.PI * 2;
      const y = Math.cos(theta) * midRadius;
      const z = Math.sin(theta) * midRadius;

      // Position: BaseZ + small offset (0.1) to clear dome
      positions.push(new THREE.Vector3(baseZ + 0.1, y, z));

      // Normal: Spraying BACKWARDS (+x)
      normals.push(new THREE.Vector3(1, 0, 0));
    }

    this.fuelSpray = new FuelSpraySystem(injectorCount, positions, normals);
    this.fuelSpray.visible = false;
    this.add(this.fuelSpray);

    // B. IGNITION SPARKS
    // 2 Locations (Plug Angles)
    const sparkPos = [];
    const plugAngles = [Math.PI * 0.3, Math.PI * 1.7];
    const sparkDist = midRadius; // Inside liner

    plugAngles.forEach(theta => {
      const y = Math.cos(theta) * sparkDist;
      const z = Math.sin(theta) * sparkDist;
      // Position: Near the plugs (BaseZ + 30% of liner length)
      sparkPos.push(new THREE.Vector3(baseZ + linerLen * 0.3, y, z));
    });

    this.ignitionSpark = new IgnitionSpark(sparkPos);
    this.add(this.ignitionSpark);

    // C. VOLUMETRIC FLAME
    // Cylinder fitting inside Liner
    const flameGeo = new THREE.CylinderGeometry(midRadius + 0.1, midRadius + 0.05, linerLen * 0.8, 32, 1, true);
    flameGeo.rotateZ(-Math.PI / 2);
    // Center of Flame = BaseZ + Half Length
    flameGeo.translate(baseZ + linerLen * 0.4, 0, 0);

    const flameMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uThrottle: { value: 0 },
        uAFR: { value: 1.0 }
      },
      vertexShader: CombustionShader.vertexShader,
      fragmentShader: CombustionShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, // Glow
      blending: THREE.AdditiveBlending
    });

    this.flameMesh = new THREE.Mesh(flameGeo, flameMat);
    this.flameMesh.name = "CombustionFlames"; // For ViewManager check
    this.flameMesh.visible = false;
    this.add(this.flameMesh);
  }

  // Define update method
  update(dt, physics) {
    // Update Effects
    const s = physics.state;
    const fuelFlow = s.fuelFlow;
    const rpm = s.rpm;

    // Update Fuel Spray
    if (this.fuelSpray) {
      this.fuelSpray.update(dt, fuelFlow);
    }

    // Update Ignition
    // Trigger logic: If RPM > 10% and moving from "Off"? 
    // Or just if physics says "Ignition On". Physics doesn't have explicit flag yet.
    // Logic: If RPM increasing between 10% and 40%, spark is usually active.
    if (this.ignitionSpark) {
      // Auto Trigger logic
      if (rpm > 10 && rpm < 40 && fuelFlow > 0.001) {
        if (!this.ignitionSpark.active) this.ignitionSpark.trigger();
      }
      this.ignitionSpark.update(dt);
    }

    // Update Flame Shader
    if (this.flameMesh && this.flameMesh.material.uniforms) {
      const u = this.flameMesh.material.uniforms;
      u.uTime.value += dt;
      u.uThrottle.value = physics.inputs.throttle / 100.0;

      // AFR Mapping: 15 (Rich) -> 0.0, 60 (Lean) -> 1.0
      // Input AFR is ~60 usually. 
      const normAFR = (physics.inputs.afr - 15) / (60 - 15);
      u.uAFR.value = Math.max(0, Math.min(1, normAFR));

      // Visibility based on Fuel Flow
      this.flameMesh.visible = (fuelFlow > 0.001);
    }
  }
}
