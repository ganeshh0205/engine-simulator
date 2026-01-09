import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Exact Replica of Web HomeScreen UI
export default function HomeScreen({ navigation }) {

    // Card Component
    const MenuCard = ({ title, subtitle, icon, gradient, onPress }) => (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            />
            <View style={styles.cardContent}>
                <View>
                    <View style={styles.accentLine} />
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardSubtitle}>{subtitle}</Text>
                </View>
                <Text style={styles.cardIcon}>{icon}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#1a202c', '#000000']}
                style={StyleSheet.absoluteFill}
            />

            {/* Header / User Profile Stub */}
            <View style={styles.topBar}>
                <Text style={styles.statusText}>STATUS: ONLINE</Text>
                <Text style={styles.welcomeText}>WELCOME, <Text style={styles.username}>PILOT</Text></Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Title Area */}
                <View style={styles.titleArea}>
                    <Text style={styles.mainTitle}>
                        PROPULSE<Text style={{ color: '#4299e1' }}>AI</Text>
                    </Text>
                    <Text style={{ color: 'red', fontSize: 20, fontWeight: 'bold' }}> (DEBUG MODE ACTIVE)</Text>
                    <Text style={styles.subTitleLabel}>ENGINEERING SUITE</Text>
                    <Text style={styles.description}>
                        Select a module to begin your simulation session.
                    </Text>
                </View>

                {/* Grid */}
                <View style={styles.grid}>
                    <MenuCard
                        title="ACADEMY"
                        subtitle="Interactive propulsion curriculum."
                        icon="🎓"
                        gradient={['#667eea', '#764ba2']}
                        onPress={() => navigation.navigate('Algorithm')}
                    />

                    <MenuCard
                        title="SIMULATION LAB"
                        subtitle="Physics-accurate sandbox environment."
                        icon="🚀"
                        gradient={['#f6d365', '#fda085']}
                        onPress={() => navigation.navigate('Simulation')}
                    />

                    <MenuCard
                        title="USER PROFILE"
                        subtitle="Track progress & settings."
                        icon="👤"
                        gradient={['#e0c3fc', '#8ec5fc']}
                        onPress={() => { }} // No Profile Screen yet
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.footerText}>SYSTEM READY • v1.0.0 Alpha • High Performance Mode Active</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    topBar: {
        padding: 30,
        paddingTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    statusText: {
        color: '#718096',
        fontSize: 10,
        fontWeight: 'bold',
    },
    welcomeText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'System', // Fallback
    },
    username: {
        color: '#4299e1',
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 30,
        paddingBottom: 100,
    },
    titleArea: {
        marginBottom: 40,
    },
    mainTitle: {
        fontSize: 48,
        fontWeight: '900',
        color: 'white',
        letterSpacing: -1,
    },
    subTitleLabel: {
        fontSize: 18,
        color: '#718096',
        fontWeight: '300',
        marginBottom: 10,
    },
    description: {
        fontSize: 16,
        color: '#a0aec0',
        maxWidth: 300,
        lineHeight: 24,
    },
    grid: {
        gap: 20,
    },
    card: {
        height: 180,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4, // Accent line style
    },
    cardContent: {
        padding: 30,
        height: '100%',
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'flex-end'
    },
    accentLine: {
        // Handled by gradient view
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#cbd5e0',
    },
    cardIcon: {
        fontSize: 40,
        opacity: 0.8,
        marginBottom: 10,
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        width: '100%',
        alignItems: 'center',
    },
    footerText: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 10,
        letterSpacing: 2,
    }
});
