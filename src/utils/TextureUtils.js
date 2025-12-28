import * as THREE from 'three';

export const TextureUtils = {
    createPerforatedMetalTexture: () => {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Background: Metal (White/Grey)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Holes: Black
        ctx.fillStyle = '#000000';
        const rows = 16;
        const cols = 16;
        const radius = 10;
        const stepX = size / cols;
        const stepY = size / rows;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                // Offset every other row
                const offsetX = (y % 2 === 0) ? 0 : stepX / 2;

                ctx.beginPath();
                ctx.arc(x * stepX + offsetX + stepX / 2, y * stepY + stepY / 2, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 1); // Stretch along engine length
        return texture;
    }
};
