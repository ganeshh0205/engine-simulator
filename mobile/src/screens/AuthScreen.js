import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme/Theme';

// Exact Replica of Web AuthScreen UI
export default function AuthScreen({ navigation }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');

    const handleAction = () => {
        // Mock Login Logic (mimicking dbManager)
        if (isLogin) {
            navigation.replace('Home');
        } else {
            navigation.replace('Home');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Background Gradient matching Web: radial-gradient(circle at center, #1e293b 0%, #090c14 100%) */}
            <LinearGradient
                colors={['#1e293b', '#090c14']}
                style={StyleSheet.absoluteFill}
            />

            {/* Background Grid Pattern (simulated with opacity) */}
            <View style={styles.gridOverlay} />

            <View style={styles.glassPanel}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.icon}>🚀</Text>
                    <Text style={styles.title}>PROPULSE AI</Text>
                    <Text style={styles.subtitle}>Advanced Propulsion Learning Environment</Text>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    {!isLogin && (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="Full Name"
                                placeholderTextColor="#666"
                                value={name} onChangeText={setName}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Email Address"
                                placeholderTextColor="#666"
                                value={email} onChangeText={setEmail}
                            />
                        </>
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder={isLogin ? "Username or Email" : "Username"}
                        placeholderTextColor="#666"
                        value={username} onChangeText={setUsername}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#666"
                        secureTextEntry
                        value={password} onChangeText={setPassword}
                    />

                    {!isLogin && (
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor="#666"
                            secureTextEntry
                        />
                    )}

                    <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
                        <Text style={styles.actionBtnText}>{isLogin ? "ENTER COCKPIT" : "JOIN PROGRAM"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                        <Text style={styles.toggleLink}>
                            {isLogin ? "New Cadet? Register here." : "Already a pilot? Return to Base."}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090c14'
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.05,
        borderWidth: 1,
        borderColor: '#fff',
        // In RN we can't easily do repeatable grid patterns without an image, 
        // so we accept a simple overlay for now to match the "feel".
    },
    glassPanel: {
        width: width * 0.9,
        maxWidth: 400,
        padding: 40,
        backgroundColor: 'rgba(20, 24, 30, 0.6)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderRadius: 16,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    icon: {
        fontSize: 48,
        marginBottom: 10,
        textShadowColor: theme.colors.primary,
        textShadowRadius: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.primary,
        letterSpacing: 3,
        textShadowColor: theme.colors.primary,
        textShadowRadius: 15,
        textAlign: 'center'
    },
    subtitle: {
        color: '#64748b',
        fontSize: 14,
        marginTop: 5,
        fontWeight: '500',
        letterSpacing: 0.5,
        textAlign: 'center'
    },
    formContainer: {
        width: '100%',
        gap: 15,
    },
    input: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 8,
        padding: 15,
        color: 'white',
        fontSize: 16,
    },
    actionBtn: {
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    actionBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1,
    },
    toggleLink: {
        color: '#64748b',
        textAlign: 'center',
        marginTop: 10,
        fontSize: 14,
    }
});
