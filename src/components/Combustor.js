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
    // USER REQUEST: Check for "increase the gap". 
    // We increase diffuserLen significantly to make room for the reducing pipes.
    const diffuserLen = 1.2;
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
       1. Diffuser System (Conical Reducer + Manifold)
    ======================= */
    const pipeCount = 12;

    // 1. DIMENSIONS
    const hpcTipR = outerRadius * 0.95; // Compressor Outer Casing (~0.95)
    const hpcHubR = inletRadius;        // Compressor Inner Hub (~0.58)

    // "Reduce it to a bit" + "Diverge": 
    // We choke the flow down to a small radius so pipes have to fan out.
    const manifoldRadius = hpcTipR * 0.5; // significantly smaller
    const manifoldLen = diffuserLen * 0.3; // Short manifold, long pipes

    // 2. MATERIALS
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x888888, // Steel Like
      metalness: 0.6,
      roughness: 0.4,
      side: THREE.DoubleSide
    });

    const copperMat = new THREE.MeshStandardMaterial({
      color: 0xb87333, // Copper
      metalness: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide // Shows inside walls (Hollow look)
    });

    // 3. CONICAL REDUCER (The "Single Pipe" reducing in size)
    // Starts at Compressor Tip, Shrinks to Manifold Radius
    // Position: 0 to manifoldLen
    const coneCenter = manifoldLen / 2;
    const coneGeo = new THREE.CylinderGeometry(manifoldRadius, hpcTipR, manifoldLen, 32, 1, true);
    coneGeo.rotateZ(-Math.PI / 2);
    coneGeo.translate(coneCenter, 0, 0);

    const cone = new THREE.Mesh(coneGeo, metalMat);
    this.add(cone);

    // Inner Cone (Wall thickness)
    const coneInnerGeo = new THREE.CylinderGeometry(manifoldRadius * 0.8, hpcHubR, manifoldLen, 32, 1, true);
    coneInnerGeo.rotateZ(-Math.PI / 2);
    coneInnerGeo.translate(coneCenter, 0, 0);
    const coneInner = new THREE.Mesh(coneInnerGeo, metalMat);
    this.add(coneInner);

    // 4. FEEDER PIPES (Diverging from Manifold to Cans)

    // Calculate CAN Geometry to match fit
    // Copied from Can generation logic below (Liner section)
    const linerThickness = (outerRadius - innerRadius) * 0.6;
    const linerInnerR = ((innerRadius + outerRadius) / 2) - linerThickness / 2;
    const linerOuterR = ((innerRadius + outerRadius) / 2) + linerThickness / 2;
    const canRadius = (linerOuterR - linerInnerR) / 2 * 0.85; // ~0.14

    // Pipe fits perfectly into Can
    const pipeRadius = canRadius * 0.95; // Slightly smaller to nest, or 1.0 to flush. 
    // User wants "perfect fit", implies continuity. Let's use 1.0 but add a flange.

    // Cans start a bit after the diffuser zone
    const canStartX = diffuserLen; // Touch the face of the liner zone
    // Destination Radius: Middle of the annular gap
    const combMidR = (innerRadius + outerRadius) * 0.5;

    // Flange Material (Darker Metal)
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.5 });
    // Hole Material (Pitch Black)
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    for (let i = 0; i < pipeCount; i++) {
      const theta = (i / pipeCount) * Math.PI * 2;

      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      // P1: Surface of the Manifold
      // Extend slightly INSIDE the manifold to look integrated
      const p1 = new THREE.Vector3(
        manifoldLen * 0.9,
        manifoldRadius * cos * 0.9,
        manifoldRadius * sin * 0.9
      );

      // P2: Center of Can Head
      // Extend slightly INSIDE the can so it dumps particles in
      const p2 = new THREE.Vector3(
        canStartX + 0.1, // Push inside Can
        combMidR * cos,
        combMidR * sin
      );

      // BEZIER CURVE
      // CP1: Exit manifold axially matches flow
      const cp1 = p1.clone().add(new THREE.Vector3(0.5, 0, 0));
      const cp2 = p2.clone().add(new THREE.Vector3(-0.3, 0, 0));

      const curve = new THREE.CubicBezierCurve3(p1, cp1, cp2, p2);

      // Tube: Wide and Hollow
      const tubeRadius = canRadius * 0.95; // Match Can size
      const tubeGeo = new THREE.TubeGeometry(curve, 12, tubeRadius, 16, false);
      const pipe = new THREE.Mesh(tubeGeo, copperMat);
      this.add(pipe);

      // FLANGE (The "Fitted" Look) at P2 (Can)
      const flangePos = new THREE.Vector3(canStartX, combMidR * cos, combMidR * sin);

      const ringGeo = new THREE.TorusGeometry(tubeRadius * 1.1, 0.03, 8, 24);
      const ring = new THREE.Mesh(ringGeo, flangeMat);
      ring.position.copy(flangePos);

      // Align Flange to Pipe Tangent at entry
      const tangent = new THREE.Vector3().subVectors(p2, cp2).normalize();
      ring.lookAt(flangePos.clone().add(tangent));
      this.add(ring);
    }


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
    // const midRadius = (innerRadius + outerRadius) / 2; // Already defined? CHECK. No midRadius is new here?
    // Wait, midRadius was defined at line 266.
    // Let's check line 266 in previous view.
    // line 266: const midRadius = (innerRadius + outerRadius) / 2;
    // But lines 267-270 vary.
    // I will replace 267-270 with empty or comments.

    // linerThickness, linerInnerR, linerOuterR are ALREADY calculated at line 165.
    // Just use them.

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
    // canRadius already calculated at line 168.
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
       5. Fuel Injectors (Refined)
    ======================= */
    const injectorMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.9,
      roughness: 0.2
    });

    const fuelLineMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.5,
      roughness: 0.5
    });

    const injectorCount = 12;

    for (let i = 0; i < injectorCount; i++) {
      const theta = (i / injectorCount) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const injX = canStartX + 0.1;
      const injR = midRadius + canRadius;

      const injPos = new THREE.Vector3(injX, injR * cos, injR * sin);

      // Nozzle Body - INCREASED SIZE
      // Radius 0.06 (was 0.02)
      const nozzleGeo = new THREE.CylinderGeometry(0.06, 0.03, 0.15, 16);
      const nozzle = new THREE.Mesh(nozzleGeo, injectorMat);
      nozzle.position.copy(injPos);
      nozzle.lookAt(injX, 0, 0);
      nozzle.rotateX(-Math.PI / 2);
      this.add(nozzle);

      // Fuel Line Connection
      const lineGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
      const line = new THREE.Mesh(lineGeo, fuelLineMat);
      line.position.copy(injPos.clone().add(new THREE.Vector3(0, cos * 0.15, sin * 0.15)));
      line.lookAt(injX, 0, 0);
      line.rotateX(-Math.PI / 2);
      this.add(line);
    }

    /* =======================
       6. Ignition Plugs (Spark Plugs)
    ======================= */
    const plugIndices = [4, 8];

    const plugGeo = new THREE.CylinderGeometry(0.03, 0.03, (outerRadius - midRadius) + 0.1, 16);
    const plugMat = new THREE.MeshStandardMaterial({ color: 0xffff00, metalness: 0.5, roughness: 0.2, emissive: 0x222200 });

    plugIndices.forEach(idx => {
      const theta = (idx / 12) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const plugX = canStartX + 0.3;

      const plug = new THREE.Mesh(plugGeo, plugMat);
      const dist = (outerRadius + midRadius) / 2;

      plug.position.set(plugX, cos * dist, sin * dist);
      plug.lookAt(plugX, 0, 0);
      plug.rotateX(Math.PI / 2);

      this.add(plug);

      const box = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      const boxDist = outerRadius + 0.05;
      box.position.set(plugX, cos * boxDist, sin * boxDist);
      box.lookAt(plugX, 0, 0);
      this.add(box);
    });

    // ===========================
    // 7. EFFECTS INTEGRATION
    // ===========================
    const effectsBaseZ = diffuserLen + linerOffset;
    this.initEffects(midRadius, linerLen, effectsBaseZ);
  }

  initEffects(midRadius, linerLen, baseZ) {
    this.sprays = [];
    this.igniters = [];

    const canCount = 12;

    for (let i = 0; i < canCount; i++) {
      const theta = (i / canCount) * Math.PI * 2;
      const y = Math.cos(theta) * midRadius;
      const z = Math.sin(theta) * midRadius;

      // A. FUEL SPRAY
      const pos = new THREE.Vector3(baseZ + 0.1, y, z);
      const norm = new THREE.Vector3(1, 0, 0);
      const spray = new FuelSpraySystem(1, [pos], [norm]);
      spray.visible = false;
      this.add(spray);
      this.sprays.push(spray);

      // B. IGNITION SPARK
      const sparkPos = new THREE.Vector3(baseZ + linerLen * 0.3, y, z);
      const igniter = new IgnitionSpark([sparkPos]);
      this.add(igniter);
      this.igniters.push(igniter);
    }

    // C. VOLUMETRIC FLAME
    const flameGeo = new THREE.CylinderGeometry(midRadius + 0.1, midRadius + 0.05, linerLen * 0.8, 32, 1, true);
    flameGeo.rotateZ(-Math.PI / 2);
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
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.flameMesh = new THREE.Mesh(flameGeo, flameMat);
    this.flameMesh.name = "CombustionFlames";
    this.flameMesh.visible = false;
    this.add(this.flameMesh);

    this.sequenceTime = 0;
  }

  // Define update method
  update(dt, physics) {
    // USE INPUTS DIRECTLY (User Requests: "Without pressing... should be off")
    const inputs = physics.inputs || {}; // Safety check

    // Throttle input 0-100? or 0-1? usually 0-100 in sims.
    // Check if distinct input available.
    // If undefined, fallback to state but threshold it higher.
    const rawThrottle = inputs.throttle !== undefined ? inputs.throttle : 0;
    const fuelFlow = rawThrottle / 100.0; // Assume 0-100 range normalization

    const ignitionInput = inputs.ignition; // Boolean usually

    // 1. FUEL SPRAYS
    // Only active if USER is modifying throttle > 0
    const sprayActive = fuelFlow > 0.001;

    this.sprays.forEach(spray => {
      if (sprayActive) {
        spray.visible = true;
        spray.update(dt, fuelFlow);
      } else {
        spray.visible = false;
      }
    });

    // 2. IGNITION SPARKS
    // Only active if USER PRESSES ignition
    this.igniters.forEach(igniter => {
      if (ignitionInput) {
        igniter.trigger();
      }
      igniter.update(dt);
    });

    // 3. FLAME VISUALS (State Based)
    // Flame is result of simulation, not just input.
    const isBurning = physics.state.combustion; // Simulation Truth

    if (this.flameMesh) {
      if (isBurning) {
        this.flameMesh.visible = true;
        this.flameMesh.material.uniforms.uTime.value += dt;
        this.flameMesh.material.uniforms.uThrottle.value = fuelFlow;

        // Heat Glow on Cans/Liner LINKED TO TEMPERATURE (T4)
        // T4 Range: Ambient (~300K) to Max (~2000K)
        // Visible Glow starts around 700K (Dull Red) -> 1600K (Bright Orange/Yellow)

        const t4 = physics.state.t4 || 300;

        // Normalize: 0 at 600K, 1 at 1800K
        const minT = 600;
        const maxT = 1800;
        let heat = (t4 - minT) / (maxT - minT);
        heat = Math.max(0, Math.min(1, heat)); // Clamp 0-1

        // Non-linear glow (Stefan-Boltzmann ish visual)
        const glow = Math.pow(heat, 1.5);

        this.linerMats.forEach(m => m.emissive.setHex(0xff5500).multiplyScalar(glow * 2.0));
      } else {
        this.flameMesh.visible = false;
        this.linerMats.forEach(m => m.emissive.setHex(0x000000));
      }
    }
  }
}
