import { PanResponder } from 'react-native';

const STATE = {
    NONE: 0,
    ROTATE: 1,
    ZOOM_PAN: 2,
};

export class TouchControls {
    constructor(camera, domElementWidth, domElementHeight) {
        this.camera = camera;
        this.width = domElementWidth;
        this.height = domElementHeight;

        // Spherical Coordinates
        this.radius = 18; // Slightly further back to see whole engine
        this.theta = Math.PI / 4;
        this.phi = Math.PI / 2.5; // Slightly lower angle

        // Center on the Engine (Length ~15, so Center ~7.5)
        this.target = { x: 7.5, y: 0, z: 0 };

        // Interaction State
        this.state = STATE.NONE;

        // Touch Tracking
        this.fingers = [];
        this.lastCenter = { x: 0, y: 0 };
        this.lastDist = 0;

        // Config
        this.rotateSpeed = 0.005;
        this.zoomSpeed = 0.15; // Increased sensitivity (was 0.05)
        this.panSpeed = 0.008; // Slightly reduced (was 0.01)

        // Pan Responder
        this.panResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: (evt, gestureState) => {
                this.handleTouchStart(evt);
            },

            onPanResponderMove: (evt, gestureState) => {
                this.handleTouchMove(evt, gestureState);
            },

            onPanResponderRelease: () => {
                this.handleTouchEnd();
            }
        });

        this.update();
    }

    handleTouchStart(evt) {
        const touches = evt.nativeEvent.touches;
        this.fingers = touches;

        if (touches.length === 1) {
            this.state = STATE.ROTATE;
            this.lastCenter = { x: touches[0].pageX, y: touches[0].pageY };
        } else if (touches.length === 2) {
            this.state = STATE.ZOOM_PAN;
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            this.lastDist = Math.sqrt(dx * dx + dy * dy);
            this.lastCenter = {
                x: (touches[0].pageX + touches[1].pageX) / 2,
                y: (touches[0].pageY + touches[1].pageY) / 2
            };
        }
    }

    handleTouchMove(evt, gestureState) {
        const touches = evt.nativeEvent.touches;

        if (this.state === STATE.ROTATE && touches.length === 1) {
            const touchX = touches[0].pageX;
            const touchY = touches[0].pageY;

            const dx = touchX - this.lastCenter.x;
            const dy = touchY - this.lastCenter.y;

            this.rotate(dx, dy);

            this.lastCenter = { x: touchX, y: touchY };

        } else if (this.state === STATE.ZOOM_PAN && touches.length >= 2) {
            // New Distance
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // New Center
            const centerX = (touches[0].pageX + touches[1].pageX) / 2;
            const centerY = (touches[0].pageY + touches[1].pageY) / 2;

            // 1. ZOOM (Distance Change)
            const deltaDist = dist - this.lastDist;
            this.zoom(deltaDist);

            // 2. PAN (Center Change)
            const deltaPanX = centerX - this.lastCenter.x;
            const deltaPanY = centerY - this.lastCenter.y;
            this.pan(deltaPanX, deltaPanY);

            this.lastDist = dist;
            this.lastCenter = { x: centerX, y: centerY };
        }
    }

    handleTouchEnd() {
        this.state = STATE.NONE;
    }

    rotate(dx, dy) {
        this.theta -= dx * this.rotateSpeed;
        this.phi -= dy * this.rotateSpeed;

        // Clamp Phi
        this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi));

        this.update();
    }

    zoom(delta) {
        this.radius -= delta * this.zoomSpeed;
        this.radius = Math.max(2.0, Math.min(50.0, this.radius)); // Limits
        this.update();
    }

    pan(dx, dy) {
        // Pan logic moves the Target, perpendicular to Camera view
        // Complex to get perfect, but simple approximation:
        // Move target in Camera's Local X and Y
        // Actually simplest is just moving target in World Y and projected World X?

        // Let's keep it simple: Pan moves target Up/Down (Y) and Left/Right (Z/X mix based on theta)

        const panScale = this.panSpeed * (this.radius / 15); // Pan faster when zoomed out

        // Camera Forward Vector (negated)
        // Camera Right Vector

        // Simple Top-Down Pan approximation:
        const sinT = Math.sin(this.theta);
        const cosT = Math.cos(this.theta);

        // Screen Left/Right (dx) moves along Perpendicular to view
        // Right Vector: (cosT, 0, -sinT)
        this.target.x -= dx * panScale * cosT;
        this.target.z += dx * panScale * sinT;

        // Screen Up/Down (dy) moves World Y (mostly) + tilt component?
        // Let's just do World Y for simplicity
        this.target.y += dy * panScale;

        this.update();
    }

    update() {
        // Spherical -> Cartesian
        // x = r * sin(phi) * sin(theta)
        // y = r * cos(phi)
        // z = r * sin(phi) * cos(theta)

        const x = this.target.x + this.radius * Math.sin(this.phi) * Math.sin(this.theta);
        const y = this.target.y + this.radius * Math.cos(this.phi);
        const z = this.target.z + this.radius * Math.sin(this.phi) * Math.cos(this.theta);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.target.x, this.target.y, this.target.z);
    }

    getPanHandlers() {
        return this.panResponder.panHandlers;
    }
}
