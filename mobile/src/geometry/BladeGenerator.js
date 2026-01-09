import * as THREE from "three";

/**
 * Generates a simple twisted blade as a swept box
 * Educational / meanline-level fidelity
 */
export function generateBlade({
  height = 0.8,
  chord = 0.25,
  thickness = 0.04,
  twistDeg = 25,
  radialSegments = 10,
}) {
  const shape = new THREE.Shape();
  shape.moveTo(-chord / 2, -thickness / 2);
  shape.lineTo(chord / 2, -thickness / 2);
  shape.lineTo(chord / 2, thickness / 2);
  shape.lineTo(-chord / 2, thickness / 2);
  shape.closePath();

  const path = new THREE.LineCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, height, 0)
  );

  const geometry = new THREE.ExtrudeGeometry(shape, {
    steps: radialSegments,
    bevelEnabled: false,
    extrudePath: path,
  });

  // Apply linear twist along height
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = v.y / height;
    const angle = THREE.MathUtils.degToRad(twistDeg * t);
    const x = v.x * Math.cos(angle) - v.z * Math.sin(angle);
    const z = v.x * Math.sin(angle) + v.z * Math.cos(angle);
    v.x = x;
    v.z = z;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Helper class for creating specific blade types
 */
export class BladeGenerator {
  static createRotor(params) {
    // Rotor blades usually twisted, thinner, higher aspect ratio
    return generateBlade({
      height: params.radius - params.hubRadius,
      chord: params.length * 0.8,
      thickness: 0.05,
      twistDeg: params.twist ? params.twist * 50 : 30, // Default twist
      radialSegments: 10
    });
  }

  static createStator(params) {
    // Stator vanes often less twisted, broader
    return generateBlade({
      height: params.radius - params.hubRadius,
      chord: params.length * 0.8,
      thickness: 0.05,
      twistDeg: -10, // Reverse twist
      radialSegments: 10
    });
  }
}
