import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../theme/Theme';

// Global Console Override (Hacky but effective for "Exact Replica")
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

let logBuffer = [];
let listeners = [];

const addLog = (type, args) => {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    logBuffer.push({ id: Date.now() + Math.random(), type, msg, time: new Date().toLocaleTimeString() });
    if (logBuffer.length > 50) logBuffer.shift(); // Keep last 50
    listeners.forEach(l => l([...logBuffer]));
};

// Hook to capture logs
console.log = (...args) => { addLog('info', args); originalLog(...args); };
console.warn = (...args) => { addLog('warn', args); originalWarn(...args); };
console.error = (...args) => { addLog('error', args); originalError(...args); };

export default function ConsolePanel() {
    const [logs, setLogs] = useState([]);
    const [minimized, setMinimized] = useState(true);

    useEffect(() => {
        const handler = (newLogs) => setLogs(newLogs);
        listeners.push(handler);
        return () => {
            listeners = listeners.filter(l => l !== handler);
        };
    }, []);

    if (minimized) {
        return (
            <TouchableOpacity style={styles.minimized} onPress={() => setMinimized(false)}>
                <Text style={styles.minText}>>_ CONSOLE</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>SYSTEM CONSOLE</Text>
                <TouchableOpacity onPress={() => setMinimized(true)}>
                    <Text style={styles.close}>[-]</Text>
                </TouchableOpacity>
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 20 }}>
                {logs.map(l => (
                    <Text key={l.id} style={[styles.logLine, styles[l.type]]}>
                        <Text style={styles.time}>[{l.time}] </Text>
                        {l.msg}
                    </Text>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: 'rgba(0,0,0,0.9)',
        borderTopWidth: 1,
        borderColor: '#333',
    },
    minimized: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'black',
        padding: 8,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#555',
        opacity: 0.7,
    },
    minText: {
        color: '#0f0',
        fontFamily: 'monospace',
        fontSize: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: '#111',
        borderBottomWidth: 1,
        borderColor: '#333',
    },
    title: {
        color: '#ccc',
        fontFamily: 'monospace',
        fontSize: 12,
    },
    close: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
    scroll: {
        flex: 1,
        padding: 10,
    },
    logLine: {
        fontFamily: 'monospace',
        fontSize: 10,
        marginBottom: 2,
    },
    info: { color: '#ccc' },
    warn: { color: '#ffcc00' },
    error: { color: '#ff4444' },
    time: { color: '#555' }
});
