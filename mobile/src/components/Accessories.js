import * as THREE from "three";

export class Accessories extends THREE.Group {
    constructor(params = {}) {
        super();
        this.name = "Accessories";

        // Position params relative to the engine core
        // We'll attach this somewhere along the length

        this.build();
    }

    build() {
        // Material: Cast Magnesium/Aluminum (Darker, matte)
        const mat = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a, // Dark Grey
            metalness: 0.6,
            roughness: 0.7,
        });

        // 1. Main Gearbox Body (The "Box")
        // A slightly irregular shape looks best. Let's stack two boxes.
        const mainBoxGeo = new THREE.BoxGeometry(1.2, 0.4, 0.8);
        const mainBox = new THREE.Mesh(mainBoxGeo, mat);
        // Position: Below the engine. 
        // Engine axis is Y=0. Casing radius ~1.0. 
        // So box should be at Y = -1.5 or so.
        mainBox.position.y = -1.5;

        this.add(mainBox);

        // 2. Secondary Pump Block (Smaller box on side)
        const pumpGeo = new THREE.BoxGeometry(0.5, 0.3, 0.4);
        const pump = new THREE.Mesh(pumpGeo, mat);
        pump.position.set(0.6, -1.5, 0.3); // Offset
        this.add(pump);

        // 3. Radial Drive Shaft (Connecting AGB to Core)
        // Vertical tube
        // Height: From Y=-1.3 (top of box) to Y=-0.9 (bottom of casing)
        const shaftGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16);
        const shaft = new THREE.Mesh(shaftGeo, mat);
        shaft.position.y = -1.1; // Midpoint between -1.5 and -0.7?
        // Approx center
        this.add(shaft);

        // 4. Pipes/Lines (Visual clutter)
        const pipelineGeo = new THREE.TorusGeometry(0.4, 0.02, 8, 24, Math.PI);
        const pipe = new THREE.Mesh(pipelineGeo, mat);
        pipe.position.y = -1.5;
        pipe.position.z = 0.45;
        this.add(pipe);
    }
}
