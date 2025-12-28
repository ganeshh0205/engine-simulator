import * as THREE from "three";
import { createRevolvedSurface } from "../geometry/RevolvedSurface.js";

export class Intake extends THREE.Group {
  constructor(params = {}) {
    super();

    this.name = "Intake";

    // Default parameters (can be overridden)
    this.params = {
      length: params.length || 1.1, // Shortened for flush Spinner
      inletRadius: params.inletRadius || 1.0, // Match Unified Casing
      throatRadius: params.throatRadius || 0.95,
      outletRadius: params.outletRadius || 0.95,
    };

    this.build();
    this.length = this.params.length;
  }

  build() {
    const { length, inletRadius, throatRadius, outletRadius } = this.params;

    // NACELLE PROFILE 
    const rLip = 1.05; // Outer Lip
    const rOuter = 1.0; // Standard Outer Skin (Matches Engine)

    // Points: [Inner path] -> [Lip Curve] -> [Outer Path] -> [Back Face]
    const profile = [];

    // 1. Inner Flow Path 
    // Start at Front Lip (x ~ 0)
    // Actually, lets put Lip evenly around x=0? No, let's start at x=0 for front.

    const lipThick = 0.1;

    // Inner Surface (Subsonic Diffuser)
    profile.push(new THREE.Vector2(throatRadius, 0.05));
    profile.push(new THREE.Vector2(outletRadius, length)); // Compressor Face

    // Back Face (Vertical Thickness at join)
    profile.push(new THREE.Vector2(rOuter, length)); // Casing Join

    // Outer Surface (Aerodynamic Cowl)
    // Straight cylinder look for blueprint match (or slight curve)
    profile.push(new THREE.Vector2(rOuter, length * 0.2));
    profile.push(new THREE.Vector2(rLip, 0.05));

    // Leading Edge Lip (Curve back to start)
    profile.push(new THREE.Vector2(throatRadius + 0.05, -0.02));
    profile.push(new THREE.Vector2(throatRadius, 0.05)); // Close loop

    // Create Geometry
    // We pass points as Vector2 for LatheGeometry
    const geometry = new THREE.LatheGeometry(profile, 64);
    geometry.rotateZ(-Math.PI / 2); // Align with X-axis
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x888888, // Darker Aluminum
      metalness: 0.4,
      roughness: 0.7,
      side: THREE.FrontSide, // Closed solid volume
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Nacelle";

    this.add(mesh);
  }
}
