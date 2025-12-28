import * as THREE from "three";

export class MaterialManager {
  static metallic(color = 0x888888) {
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.9,
      roughness: 0.25,
    });
  }

  static matte(color = 0xaaaaaa) {
    return new THREE.MeshStandardMaterial({
      color,
      metalness: 0.1,
      roughness: 0.8,
    });
  }

  static transparent(color = 0x66aaff) {
    return new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      metalness: 0.0,
      roughness: 0.4,
    });
  }

  static wireframe(color = 0xffffff) {
    return new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
    });
  }
}
