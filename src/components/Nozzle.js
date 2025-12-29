import * as THREE from "three";
import { createRevolvedSurface } from "../geometry/RevolvedSurface.js";

export class Nozzle extends THREE.Group {
  constructor(params = {}) {
    super();
    this.name = "Nozzle";

    this.params = {
      length: params.length || 2.0,
      inletRadius: params.inletRadius || 1.55, // Match enlarged Turbine exit
      throatRadius: params.throatRadius || 1.25, // Converging
      exitRadius: params.exitRadius || 0.95, // Smaller free end
    };

    this.build();
    this.length = this.params.length;

  }

  build() {
    const { length, inletRadius, throatRadius, exitRadius } = this.params;

    // Radius profile along engine axis
    const profile = [
      { x: 0.0, r: inletRadius },              // inlet
      { x: 0.4 * length, r: throatRadius },    // throat (minimum area)
      { x: length, r: exitRadius },             // exit
    ];

    const geometry = createRevolvedSurface(profile, 64);
    geometry.rotateZ(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0xa0a0a0, // Match Standard Casing Grey
      metalness: 0.5,
      roughness: 0.4,
      side: THREE.DoubleSide,
      emissive: 0x000000, // No glow by default
      emissiveIntensity: 1.0,
      transparent: false, // Solid Body
      opacity: 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "NozzleShell";

    this.add(mesh);

    // Exhaust Cone (Tail Cone)
    const coneHeight = length; // Match Nozzle Length (2.0)
    const coneGeo = new THREE.ConeGeometry(
      0.7,   // Base Radius (Match Turbine Hub)
      coneHeight,
      32
    );
    const cone = new THREE.Mesh(coneGeo, material);
    cone.rotation.z = -Math.PI / 2; // Point Backward (+X)
    cone.position.x = coneHeight / 2; // Start from 0
    cone.name = "ExhaustCone";
    this.coneMat = material; // Expose for Heat Glow
    this.add(cone);
  }
}
