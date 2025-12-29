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
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.2, 'rgba(100, 100, 255, 0.8)');
        grad.addColorStop(0.5, 'rgba(0, 0, 255, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        const tex = new THREE.CanvasTexture(canvas);
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
