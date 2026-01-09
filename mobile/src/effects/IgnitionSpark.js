import * as THREE from "three";

export class IgnitionSpark extends THREE.Group {
    constructor(positions) {
        super();
        this.sparks = [];

        const mat = new THREE.SpriteMaterial({
            color: 0xffffff,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.0,
            depthWrite: false
        });

        // Load Texture if possible, or generate canvas texture for "Star/Spark"
        // Generate Texture Data (Soft Circle Sprite) directly
        const size = 64;
        const radius = size / 2;
        const data = new Uint8Array(size * size * 4);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - radius;
                const dy = y - radius;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const normalizedDist = Math.min(dist / radius, 1.0);

                // Radial Gradient: White center -> Blue Mid -> Transparent Edge
                let r, g, b, a;
                if (normalizedDist < 0.2) {
                    // Core White
                    r = 255; g = 255; b = 255; a = 255;
                } else if (normalizedDist < 0.5) {
                    // Mid Blue
                    r = 100; g = 100; b = 255; a = Math.floor(200 * (1.0 - (normalizedDist - 0.2) / 0.3));
                } else {
                    // Edge Fade
                    r = 0; g = 0; b = 255; a = Math.floor(50 * (1.0 - normalizedDist));
                }

                const index = (y * size + x) * 4;
                data[index] = r;
                data[index + 1] = g;
                data[index + 2] = b;
                data[index + 3] = a;
            }
        }

        const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        tex.needsUpdate = true;
        mat.map = tex;

        positions.forEach(pos => {
            const s = new THREE.Sprite(mat.clone()); // Clone to allow individual opacity? Or shared?
            // Shared material means they flash together. That's fine.
            // Actually, independent flickering is better.
            s.material = mat.clone();
            s.material.map = tex;
            s.position.copy(pos);
            s.scale.set(0.15, 0.15, 0.15);
            s.visible = false;
            this.add(s);
            this.sparks.push(s);
        });

        this.active = false;
        this.timer = 0;
    }

    trigger() {
        this.active = true;
        this.timer = 1.5; // Run for 1.5 seconds
        this.sparks.forEach(s => s.visible = true);
    }

    update(dt) {
        if (!this.active) return;

        this.timer -= dt;
        if (this.timer <= 0) {
            this.active = false;
            this.sparks.forEach(s => s.visible = false);
            return;
        }

        // Flicker
        this.sparks.forEach(s => {
            // Random opacity 0.5 to 1.0
            s.material.opacity = 0.5 + Math.random() * 0.5;
            // Random brightness / scale jitter
            const scale = 0.1 + Math.random() * 0.1;
            s.scale.set(scale, scale, scale);
            s.material.rotation += (Math.random() - 0.5) * 10 * dt;
        });
    }
}
