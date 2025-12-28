import * as THREE from "three";
import { TextureUtils } from "../utils/TextureUtils.js";

export class Combustor extends THREE.Group {
  constructor(params = {}) {
    super();
    this.name = "Combustor";

    this.params = {
      length: params.length || 2.0,
      innerRadius: params.innerRadius || 0.45, // Match Hub
      outerRadius: params.outerRadius || 1.0, // Standard Casing (was 0.95)
    };

    this.build();
    this.length = this.params.length;

  }

  build() {
    const { length, innerRadius, outerRadius } = this.params;

    // ===========================
    // 0. CENTRAL DRIVE SHAFT
    // ===========================
    // Connects Compressor (front) to Turbine (back). Visible through transparent combustor.
    const shaftRadius = 0.18;
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
       1. Diffuser Plate (Front Wall)
    ======================= */
    const plateGeo = new THREE.RingGeometry(shaftRadius, outerRadius, 32); // Inner hole for shaft
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.7,
      roughness: 0.5,
      side: THREE.DoubleSide
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.rotation.y = -Math.PI / 2;
    plate.position.x = 0;
    this.add(plate);

    /* =======================
       2. Burner Ring (Injectors)
    ======================= */
    // Simple ring of spheres/cylinders
    /* =======================
       2. Burner Ring (Detailed Injectors & Flame Holders)
    ======================= */
    const injectorCount = 16;
    const injectorGroup = new THREE.Group();
    const midRadius = (innerRadius + outerRadius) / 2;

    // Materials
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.3
    });

    // Flame Holder Torus (V-Gutter style ring)
    const flameHolderGeo = new THREE.TorusGeometry(midRadius, 0.05, 16, 64);
    const flameHolder = new THREE.Mesh(flameHolderGeo, steelMat);
    flameHolder.rotation.y = Math.PI / 2; // Face Z
    flameHolder.position.x = 0.4;
    injectorGroup.add(flameHolder);

    // Injector Nozzles
    const nozzleGeo = new THREE.ConeGeometry(0.04, 0.1, 16);
    const armGeo = new THREE.CylinderGeometry(0.02, 0.02, (outerRadius - midRadius), 8);

    for (let i = 0; i < injectorCount; i++) {
      const theta = (i / injectorCount) * Math.PI * 2;
      const y = Math.cos(theta) * midRadius;
      const z = Math.sin(theta) * midRadius;

      // 1. The Nozzle Tip
      const nozzle = new THREE.Mesh(nozzleGeo, steelMat);
      nozzle.position.set(0.1, y, z);
      nozzle.rotation.z = -Math.PI / 2; // Point downstream
      injectorGroup.add(nozzle);

      // 2. Feed Arm (connecting to outer casing)
      const arm = new THREE.Mesh(armGeo, steelMat);
      // Position halfway between ring and outer
      const armDist = midRadius + (outerRadius - midRadius) / 2;
      arm.position.set(0.1, Math.cos(theta) * armDist, Math.sin(theta) * armDist);
      // Rotate to align radial
      arm.lookAt(0.1, 0, 0);
      arm.rotateX(Math.PI / 2); // Cylinder orientation fix
      injectorGroup.add(arm);
    }
    this.add(injectorGroup);


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
    });

    const casing = new THREE.Mesh(casingGeo, casingMat);
    casing.position.x = length / 2;
    casing.name = "CombustorCasing";
    this.add(casing);

    /* =======================
       4. Combustion Cans (Can-Annular Design)
    ======================= */
    // User requested "Cans" - distinct chambers.
    // We will place 8 Cans around the central axis.

    const canCount = 8;
    const canGroup = new THREE.Group();
    const canRadius = 0.22; // Fit within (0.45 to 1.0 annulus)
    // const midRadius = (innerRadius + outerRadius) / 2; // Already defined above

    // Geometry for a single Can
    // Snout (Cone) -> Body (Cylinder) -> Exit (Cone)
    const bodyLen = length * 0.6;
    const snoutLen = length * 0.2;
    const exitLen = length * 0.2;

    // 1. Body
    const canBodyGeo = new THREE.CylinderGeometry(canRadius, canRadius, bodyLen, 16, 1, true);
    canBodyGeo.rotateX(Math.PI / 2); // Align Z
    canBodyGeo.translate(0, 0, snoutLen + bodyLen / 2); // Offset

    // 2. Snout (Inlet)
    const canSnoutGeo = new THREE.CylinderGeometry(canRadius, canRadius * 0.5, snoutLen, 16, 1, true);
    canSnoutGeo.rotateX(Math.PI / 2);
    canSnoutGeo.translate(0, 0, snoutLen / 2);

    // 3. Exit (Outlet)
    const canExitGeo = new THREE.CylinderGeometry(canRadius * 0.6, canRadius, exitLen, 16, 1, true);
    canExitGeo.rotateX(Math.PI / 2);
    canExitGeo.translate(0, 0, snoutLen + bodyLen + exitLen / 2);

    // Merge (Conceptually simplify: Just use Body for visual or Group)
    // Actually easier to just build a Mesh for each part or merge geometries.
    // Let's use a single merged geometry for performance/simplicity? 
    // Or just 3 meshes per can.
    // Merging geometries is better.
    // BufferGeometryUtils is not imported. Let's mostly stick to Group of meshes or just the Body for transparency.
    // Let's make one "CanMesh" which is the main body.

    // Material
    const perforatedTex = TextureUtils.createPerforatedMetalTexture();
    this.canMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.6,
      roughness: 0.4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      alphaMap: perforatedTex,
      alphaTest: 0.3,
      emissive: 0x000000,
    });
    for (let i = 0; i < canCount; i++) {
      const theta = (i / canCount) * Math.PI * 2;
      const x = 0; // Local
      const y = Math.cos(theta) * midRadius;
      const z = Math.sin(theta) * midRadius;

      const canWrapper = new THREE.Group();
      canWrapper.position.set(0, y, z);

      // Correct Geometry Orientation: 
      // We want the Can to point along X axis.
      // Cylinder aligned to X.

      const geom = new THREE.CylinderGeometry(canRadius, canRadius, length * 0.8, 16, 1, true);
      geom.rotateZ(-Math.PI / 2); // Align to X axis
      geom.translate(length / 2, 0, 0); // Center in X

      const canMesh = new THREE.Mesh(geom, this.canMat);
      canWrapper.add(canMesh);

      // Snout
      const snout = new THREE.Mesh(
        new THREE.CylinderGeometry(canRadius, canRadius * 0.5, length * 0.1, 16, 1, true)
          .rotateZ(-Math.PI / 2)
          .translate(length * 0.05, 0, 0),
        this.canMat
      );
      canWrapper.add(snout);

      canGroup.add(canWrapper);
    }
    this.add(canGroup);

    // Expose for Heat Glow
    this.linerMats = [this.canMat];

    // Add visual connections (transition ducts)
    // Optional: Connecting pipes to Turbine?
    // For now, the Cans are the main visual.
  }
}
