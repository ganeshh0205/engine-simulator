import * as THREE from "three";

/**
 * Creates a revolved surface from a radius profile
 * profile: Array of { x, r }
 */
export function createRevolvedSurface(profile, segments = 64) {
  const points = profile.map(p => new THREE.Vector2(p.r, p.x));
  const geometry = new THREE.LatheGeometry(points, segments);
  geometry.computeVertexNormals();
  return geometry;
}
