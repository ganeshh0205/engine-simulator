import React, { useRef, useState } from 'react';
import { GLView } from 'expo-gl';
import { StyleSheet, View, Text } from 'react-native';
import { MobileSceneManager } from '../core/MobileSceneManager';
import { TouchControls } from './TouchControls';
import SimControls from './SimControls';

export default function EngineCanvas({ scenario }) {
    const sceneManagerRef = useRef(null);
    const controlsRef = useRef(null);
    const [panHandlers, setPanHandlers] = useState({});
    const [status, setStatus] = useState("Initializing GL...");
    const [error, setError] = useState(null);

    // Update Scenario when prop changes
    React.useEffect(() => {
        if (sceneManagerRef.current && scenario) {
            sceneManagerRef.current.setScenario(scenario);
        }
    }, [scenario]);

    const onContextCreate = async (gl) => {
        try {
            console.log("GL Context Created");

            // Pass callbacks for loading progress and errors
            sceneManagerRef.current = new MobileSceneManager(
                gl,
                (msg) => setStatus(msg),
                (err) => {
                    console.error(err);
                    setError(err.message);
                }
            );

            // Initialize Controls
            const camera = sceneManagerRef.current.camera;
            controlsRef.current = new TouchControls(camera, gl.drawingBufferWidth, gl.drawingBufferHeight);
            setPanHandlers(controlsRef.current.getPanHandlers());

            const animate = () => {
                if (sceneManagerRef.current) {
                    sceneManagerRef.current.render();
                }
                requestAnimationFrame(animate);
            };
            animate();
        } catch (e) {
            console.error("Critical Init Error:", e);
            setError(e.message);
        }
    };

    // Handle Sim Updates from UI
    const handleSimUpdate = (state) => {
        if (sceneManagerRef.current && sceneManagerRef.current.physics) {
            sceneManagerRef.current.physics.inputs.throttle = state.throttle;
            sceneManagerRef.current.physics.inputs.ignition = state.ignition;
            // New Inputs
            if (state.altitude !== undefined) sceneManagerRef.current.physics.inputs.altitude = state.altitude;
            if (state.mach !== undefined) sceneManagerRef.current.physics.inputs.mach = state.mach;
            if (state.nozzleArea !== undefined) sceneManagerRef.current.physics.inputs.nozzleArea = state.nozzleArea;
        }
    };

    return (
        <View style={styles.container} {...panHandlers}>
            <GLView
                style={styles.glView}
                onContextCreate={onContextCreate}
            />

            {/* Overlay UI */}
            <SimControls onUpdate={handleSimUpdate} />

            {/* Loading / Debug Overlay */}
            <View style={styles.overlay}>
                {error ? (
                    <Text style={styles.errorText}>Error: {error}</Text>
                ) : (
                    status !== "Ready!" && <Text style={styles.statusText}>{status}</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    glView: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    statusText: {
        color: '#ffff00',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        borderRadius: 5,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ff0000',
        backgroundColor: 'rgba(50,0,0,0.8)',
        padding: 10,
        borderRadius: 5,
        fontWeight: 'bold',
        textAlign: 'center'
    }
});
