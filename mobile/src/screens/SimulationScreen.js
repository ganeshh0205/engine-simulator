import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import EngineCanvas from '../components/EngineCanvas'; // The existing Canvas
import ConsolePanel from '../components/ConsolePanel';
import { theme } from '../theme/Theme';

export default function SimulationScreen({ navigation }) {
    return (
        <View style={styles.container}>
            {/* The 3D Engine View */}
            <EngineCanvas />

            {/* Overlay Navigation (Back Button) */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.backText}>← DASHBOARD</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.textSecondary,
    },
    backText: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    }
});
