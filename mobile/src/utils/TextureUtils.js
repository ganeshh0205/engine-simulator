import * as THREE from 'three';

export const TextureUtils = {
    createPerforatedMetalTexture: () => {
        const size = 128;
        const data = new Uint8Array(size * size * 4);

        // Configuration
        const rows = 32; // More density
        const cols = 32;
        const holeRadius = 6;
        const cellW = size / cols;
        const cellH = size / rows;

        // Fill White (Metal)
        for (let i = 0; i < data.length; i++) data[i] = 255;

        // Punch Holes (Black)
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const cellX = Math.floor(x / cellW);
                const cellY = Math.floor(y / cellH);

                // Center of the cell
                let cx = cellX * cellW + cellW / 2;
                let cy = cellY * cellH + cellH / 2;

                // Offset even rows
                if (cellY % 2 === 0) {
                    cx += cellW / 2;
                    if (cx > size) cx -= size;
                }

                // Distance to hole center
                // Wrap around X
                let dx = Math.abs(x - cx);
                if (dx > size / 2) dx = size - dx; // Tiling logic approx

                const dy = y - cy;
                const distSq = dx * dx + dy * dy;

                if (distSq < holeRadius * holeRadius) {
                    const idx = (y * size + x) * 4;
                    // Black (Transparent in Alpha Map)
                    data[idx] = 0;     // R
                    data[idx + 1] = 0;   // G
                    data[idx + 2] = 0;   // B
                    data[idx + 3] = 255; // A (AlphaMap uses Green channel usually, or Luminance)
                    // Three.js AlphaMap: White = Opaque, Black = Transparent.
                }
            }
        }

        const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 1);
        texture.needsUpdate = true;

        return texture;
    }
};
