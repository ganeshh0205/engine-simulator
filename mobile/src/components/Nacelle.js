import * as THREE from "three";

export class Nacelle extends THREE.Group {
    constructor(params = {}) {
        super();
        this.name = "Nacelle";

        this.params = {
            length: params.length || 7.0, // Cover most of the engine
            radius: params.radius || 1.1, // Slightly larger than Casing (1.0)
            opacity: params.opacity || 0.15,
        };

        this.build();
    }

    build() {
        const { length, radius, opacity } = this.params;

        // Create a smooth aerodynamic outer shell
        const points = [];

        // Intake Lip (Rounded)
        points.push(new THREE.Vector2(radius * 0.95, 0));
        points.push(new THREE.Vector2(radius, 0.2));

        // Main Body
        points.push(new THREE.Vector2(radius, length * 0.8));

        // Exhaust Taper
        points.push(new THREE.Vector2(radius * 0.9, length));

        const geometry = new THREE.LatheGeometry(points, 64);

        // Glass/Clear Plastic-like material for visibility
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0.1,
            roughness: 0.1,
            transparent: true,
            opacity: opacity,
            side: THREE.FrontSide,
            transmission: 0.5, // Glass-like transmission
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.z = -Math.PI / 2; // Align along X axis
        mesh.name = "NacelleMesh";
        mesh.raycast = () => { }; // Disable Raycasting/Selection

        // Position it to cover the engine (Intake starts at 0, roughly)
        // Adjust position based on where the engine starts. 
        // Usually Engine starts at 0. Let's shift it slightly back if needed.
        // For now, start at -0.5 to cover intake lip.
        mesh.position.x = -0.5;

        this.add(mesh);

        // Add some structural rings for detail
        const ringGeo = new THREE.TorusGeometry(radius, 0.02, 16, 64);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.4
        });

        for (let i = 0; i <= 3; i++) {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.y = Math.PI / 2;
            ring.position.x = (length * i / 3) - 0.5;
            this.add(ring);
        }
    }
}
