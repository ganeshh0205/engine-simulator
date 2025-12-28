import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class CameraManager {
  constructor(camera, renderer) {
    this.controls = new OrbitControls(camera, renderer.domElement);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;

    this.controls.minDistance = 2;
    this.controls.maxDistance = 50;

    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  update() {
    this.controls.update();
  }
}
