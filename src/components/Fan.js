import * as THREE from "three";
import { generateBlade } from "../geometry/BladeGenerator.js";

export class Fan extends THREE.Group {
  constructor(params = {}) {
    super();
    this.name = "Fan";

    this.params = {
      hubRadius: params.hubRadius || 0.5,
      tipRadius: params.tipRadius || 1.8, // Big Fan!
      bladeCount: params.bladeCount || 24, // Wide chord blades
      rpm: params.rpm || 3000, // Slower than core
    };

    this.rotorGroup = new THREE.Group();
    this.add(this.rotorGroup);

    // Length of the Fan stage (Hub/Spinner depth)
    this.length = 1.0;

    this.build();
  }

  build() {
    const { hubRadius, tipRadius, bladeCount } = this.params;

    const metal = new THREE.MeshStandardMaterial({
      color: 0x333333, // Dark titanium fan blades
      metalness: 0.5,
      roughness: 0.6,
    });

    const spinnerMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa, // Matte Spinner
      metalness: 0.4,
      roughness: 0.6
    });

    /* =======================
       1. Hub / Disk
    ======================= */
    const hubGeo = new THREE.CylinderGeometry(hubRadius, hubRadius, 0.8, 32);
    hubGeo.rotateZ(-Math.PI / 2);
    hubGeo.translate(0.4, 0, 0); // 0 to 0.8
    const hub = new THREE.Mesh(hubGeo, metal);
    this.rotorGroup.add(hub);

    /* =======================
       2. Spinner (Bullet)
    ======================= */
    const spinnerHeight = 1.2;
    const spinnerPoints = [];
    const numPoints = 20;
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const x = -spinnerHeight * (1 - t);
      const r = hubRadius * Math.sin(t * Math.PI / 2); // Curve
      spinnerPoints.push(new THREE.Vector2(r, x));
    }
    const spinnerGeo = new THREE.LatheGeometry(spinnerPoints, 32);
    const spinner = new THREE.Mesh(spinnerGeo, spinnerMat);
    spinner.rotation.x = -Math.PI / 2;
    spinner.rotation.z = -Math.PI / 2;
    // Spinner ends at 0, fan starts at 0. Perfect.
    this.rotorGroup.add(spinner);

    /* =======================
       3. Big Fan Blades
    ======================= */
    const bladeGeo = generateBlade({
      height: tipRadius - hubRadius,
      chord: 0.4, // Wide chord
      thickness: 0.05,
      twistDeg: 35, // High twist
    });

    for (let i = 0; i < bladeCount; i++) {
      const blade = new THREE.Mesh(bladeGeo, metal);
      // Determine position
      // Fan blades often sit slightly forward on the hub
      const rotorX = 0.3;

      const theta = (i / bladeCount) * Math.PI * 2;
      blade.position.y = Math.cos(theta) * hubRadius;
      blade.position.z = Math.sin(theta) * hubRadius;
      blade.position.x = rotorX;

      blade.rotation.x = theta;
      blade.rotation.y = 0.6; // AoA

      blade.name = `FanBlade_${i}`;
      this.rotorGroup.add(blade);
    }
  }

  update(dt) {
    const omega = (this.params.rpm * 2 * Math.PI) / 60;
    this.rotorGroup.rotation.x += omega * dt;
  }
}
