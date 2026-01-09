import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme/Theme';

// Note: Removed external Slider import to fix crash. Using Button controls.

export default function SimControls({ onUpdate }) {
    const [throttle, setThrottle] = useState(0); // 0-100
    const [ignition, setIgnition] = useState(false);

    // New Inputs
    const [altitude, setAltitude] = useState(0); // 0-50000 ft
    const [mach, setMach] = useState(0.0); // 0.0-2.0
    const [nozzleArea, setNozzleArea] = useState(1.0); // 0.5-1.5

    const updateSim = (t, ign, alt, m, naz) => {
        onUpdate({
            throttle: t,
            ignition: ign,
            altitude: alt,
            mach: m,
            nozzleArea: naz
        });
    };

    const handleThrottleChange = (val) => {
        const v = Math.max(0, Math.min(100, val));
        setThrottle(v);
        updateSim(v, ignition, altitude, mach, nozzleArea);
    };

    const handleAltitudeChange = (val) => {
        const v = Math.max(0, Math.min(50000, val));
        setAltitude(v);
        updateSim(throttle, ignition, v, mach, nozzleArea);
    };

    const handleMachChange = (val) => {
        // Round to 1 decimal for cleanliness
        let v = Math.max(0, Math.min(3.0, val));
        v = Math.round(v * 10) / 10;
        setMach(v);
        updateSim(throttle, ignition, altitude, v, nozzleArea);
    };

    const handleNozzleChange = (val) => {
        let v = Math.max(0.5, Math.min(1.5, val));
        v = Math.round(v * 10) / 10;
        setNozzleArea(v);
        updateSim(throttle, ignition, altitude, mach, v);
    };

    const toggleIgnition = () => {
        const newVal = !ignition;
        setIgnition(newVal);
        updateSim(throttle, newVal, altitude, mach, nozzleArea);
    }

    // Dynamic Colors
    const egt = 20 + (ignition ? throttle * 8 : 0);
    const rpm = throttle * 150 + (ignition ? 500 : 0);

    // EGT Color Warning
    let egtColor = theme.colors.success;
    if (egt > 600) egtColor = "#FFCC00"; // Warn
    if (egt > 800) egtColor = theme.colors.error; // Crit

    // Helper for Control Row
    const renderControlRow = (label, valueStr, onMinus, onPlus) => (
        <View style={styles.controlRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.labelValue}>{valueStr}</Text>
            </View>
            <View style={styles.btnGroup}>
                <TouchableOpacity style={styles.smBtn} onPress={onMinus}>
                    <Text style={styles.smBtnText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smBtn} onPress={onPlus}>
                    <Text style={styles.smBtnText}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container} pointerEvents="box-none">

            {/* HUD Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>TURBOJET LAB</Text>
                    <Text style={styles.subtitle}>REAL-TIME TELEMETRY</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.statLabel}>RPM</Text>
                    <Text style={styles.statValue}>{Math.floor(rpm)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.statLabel}>EGT</Text>
                    <Text style={[styles.statValue, { color: egtColor }]}>{Math.floor(egt)}°C</Text>
                </View>
            </View>

            {/* Bottom Controls */}
            <View style={styles.controls}>

                {/* Ignition Switch */}
                <TouchableOpacity
                    style={[styles.ignButton, ignition ? styles.ignOn : styles.ignOff]}
                    onPress={toggleIgnition}>
                    <Text style={styles.btnText}>{ignition ? "IGNITION ACTIVE" : "START ENGINE"}</Text>
                    <View style={[styles.indicator, { backgroundColor: ignition ? theme.colors.success : '#555' }]} />
                </TouchableOpacity>

                {/* FLIGHT CONDITIONS GROUP */}
                <View style={styles.group}>
                    <Text style={styles.groupTitle}>FLIGHT CONDITIONS</Text>
                    {renderControlRow("ALTITUDE", `${altitude} ft`, () => handleAltitudeChange(altitude - 1000), () => handleAltitudeChange(altitude + 1000))}
                    {renderControlRow("MACH", `M ${mach.toFixed(1)}`, () => handleMachChange(mach - 0.1), () => handleMachChange(mach + 0.1))}
                </View>

                {/* THROTTLE GROUP */}
                <View style={styles.group}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={styles.label}>THROTTLE</Text>
                        <Text style={styles.labelValue}>{Math.floor(throttle)}%</Text>
                    </View>
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.tBtn} onPress={() => handleThrottleChange(throttle - 5)}>
                            <Text style={styles.tBtnText}>-</Text>
                        </TouchableOpacity>
                        <View style={styles.barContainer}>
                            <View style={[styles.barFill, { width: `${throttle}%` }]} />
                        </View>
                        <TouchableOpacity style={styles.tBtn} onPress={() => handleThrottleChange(throttle + 5)}>
                            <Text style={styles.tBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* NOZZLE GROUP */}
                <View style={[styles.group, { marginTop: 5 }]}>
                    {renderControlRow("NOZZLE AREA", `x ${nozzleArea.toFixed(1)}`, () => handleNozzleChange(nozzleArea - 0.1), () => handleNozzleChange(nozzleArea + 0.1))}
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
        padding: theme.spacing.l,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 15,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderColor: theme.colors.primary,
    },
    title: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
    subtitle: {
        color: '#666',
        fontSize: 10,
        letterSpacing: 1,
    },
    statLabel: {
        color: '#888',
        fontSize: 10,
        fontWeight: 'bold',
    },
    statValue: {
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 18,
        fontWeight: 'bold',
    },
    controls: {
        alignItems: 'center',
        gap: 10,
        paddingBottom: 20,
        width: '100%',
    },
    group: {
        width: '100%',
        backgroundColor: 'rgba(20,20,20,0.9)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    groupTitle: {
        color: '#666',
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    btnGroup: {
        flexDirection: 'row',
        gap: 10,
    },
    smBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#555',
    },
    smBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: -2,
    },
    ignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: 'rgba(20,20,20,0.9)',
        marginBottom: 5,
    },
    ignOn: {
        borderColor: theme.colors.success,
        backgroundColor: 'rgba(0,255,136,0.1)',
    },
    ignOff: {
        borderColor: '#444',
    },
    btnText: {
        color: '#fff',
        fontWeight: 'bold',
        letterSpacing: 1,
        fontSize: 12,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    // Remapped for back-compat
    throttleGroup: {
        display: 'none' // Hidden, replaced by generic group
    },
    label: {
        color: '#888',
        fontSize: 10,
        fontWeight: '700',
    },
    labelValue: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    tBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#555',
    },
    tBtnText: {
        color: '#fff',
        fontSize: 20,
        marginTop: -2,
    },
    barContainer: {
        flex: 1,
        height: 6,
        backgroundColor: '#111',
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: theme.colors.primary,
    },
});
