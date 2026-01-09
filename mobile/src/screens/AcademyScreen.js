import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { Chapter1 } from '../data/Chapter1Content';
import { Chapter2 } from '../data/Chapter2Content';
import EngineCanvas from '../components/EngineCanvas';
import { theme } from '../theme/Theme';

export default function AcademyScreen({ navigation, route }) {
    // Determine Chapter from Params or Default
    const chapterId = route.params?.chapterId || 'chapter2'; // Default to Ch2 for User Request
    const selectedChapter = chapterId === 'chapter2' ? Chapter2 : Chapter1;

    const [moduleIndex, setModuleIndex] = useState(0);
    const [sectionIndex, setSectionIndex] = useState(0);
    const [xp, setXp] = useState(350); // MOCKED STATE (In real app, fetch from AsyncStorage)
    const [rewardClaimed, setRewardClaimed] = useState(false);

    // Mock Profile
    const userProfile = { name: "Maheedhar", style: "Aggressive" };

    const module = selectedChapter.modules[moduleIndex];

    // --- PERSONALIZATION HELPERS ---
    const getRank = (x) => {
        if (x < 500) return "CADET ENGINEER";
        if (x < 1000) return "FLIGHT OFFICER";
        return "CHIEF TEST PILOT";
    };
    const getNextRankXP = (x) => (x < 500 ? 500 : 1000);

    const getAIAnalysis = (title, currentXp) => {
        if (currentXp > 800) return `Outstanding, Captain ${userProfile.name}. Your telemetry indicates mastery of this system.`;
        if (title.includes("Compressor")) return `Cadet ${userProfile.name}, my analysis shows you tend to stall at low RPM. Watch the N1 gauge here.`;
        if (title.includes("Combustor")) return `Recommendation: Ensure Fuel-Air Ratio stays below 0.05 during ignition, ${userProfile.name}.`;
        return `I have analyzed this module. Key concept: Energy Conversion. Efficiency rating: HIGH.`;
    };

    // Check if current section is a Lab Scene
    const currentSection = module.sections[sectionIndex];
    // DEBUG: Force Lab Scene to verify Native View
    const isLabScene = true; // currentSection && (currentSection.type === 'lab_scene' || currentSection.type === 'cinematic_scene');

    // --- RENDER NATIVE LAB SCENE (3D + Overlay) ---
    const renderLabScene = () => {
        return (
            <View style={styles.labContainer}>
                {/* 1. 3D VISUALIZATION (Fullscreen) */}
                <View style={styles.canvasContainer}>
                    <EngineCanvas scenario={currentSection.scenario || 'default'} />
                </View>

                {/* 2. TEXT WIDGET (Bottom Sheet - 35% / Auto) */}
                <View style={styles.labOverlay}>
                    <Text style={{ color: 'red', fontWeight: 'bold', marginBottom: 10 }}>DEBUG: NATIVE VIEW ACTIVE</Text>
                    <Text style={styles.labTitle}>SCENE {sectionIndex + 1}</Text>
                    <Text style={styles.labBody}>
                        {currentSection.content || "Experience the particle flow visualization."}
                    </Text>

                    {/* GAMIFICATION & AI REWARDS (EduAIThon Feature) - React Native Port */}
                    <View style={{ marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: 'bold' }}>🏆 PILOT PROGRESS & REWARDS</Text>
                        </View>

                        {/* Rank & XP */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>Rank: CADET ENGINEER</Text>
                            <Text style={{ color: '#cbd5e0', fontSize: 12 }}>350 / 500 XP</Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 15, overflow: 'hidden' }}>
                            <View style={{ width: '70%', height: '100%', backgroundColor: '#fbbf24' }} />
                        </View>

                        <Text style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic', marginBottom: 15 }}>
                            "AI Analysis: You have mastered 'Energy Conversion'. Efficiency rating: HIGH."
                        </Text>

                        <TouchableOpacity
                            style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#fbbf24' }}
                            onPress={() => alert("🎉 +50 XP EARNED!\n\nRank Progress Updated.\nKeep flying to unlock 'Test Pilot' status.")}>
                            <Text style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 12 }}>🎁 CLAIM REWARD</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.nextBtn}
                        onPress={handleNext}>
                        <Text style={styles.nextBtnText}>NEXT SCENE →</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // --- RENDER TEXT CONTENT (WebView) ---
    const generateHTML = () => {
        // ... (Existing HTML Logic reduced for brevity, re-using explanation blocks)
        const content = module.sections.map(sec => {
            if (sec.type === 'explanation') return `<div class="block explanation">${sec.content}</div>`;
            return '';
        }).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { background: #f7fafc; font-family: sans-serif; padding: 20px; color: #2d3748; }
                    .explanation { font-size: 1.1rem; line-height: 1.6; }
                </style>
            </head>
            <body>
                <h1>${module.title}</h1>
                ${content}
            </body>
            </html>
        `;
    };

    const handleNext = () => {
        // Simple progression
        if (sectionIndex < module.sections.length - 1) {
            setSectionIndex(sectionIndex + 1);
        } else {
            if (moduleIndex < selectedChapter.modules.length - 1) {
                setModuleIndex(moduleIndex + 1);
                setSectionIndex(0);
            } else {
                navigation.goBack();
            }
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← DASHBOARD</Text>
                </TouchableOpacity>
                {/* <Text style={styles.title}>ACADEMY - {selectedChapter === Chapter1 ? "CH 1" : "CH 2"}</Text> */}
            </View>

            {isLabScene ? renderLabScene() : (
                <WebView
                    originWhitelist={['*']}
                    source={{ html: generateHTML() }}
                    style={{ flex: 1 }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#000' },
    header: {
        position: 'absolute', top: 40, left: 0, right: 0, // Float header too
        flexDirection: 'row', alignItems: 'center', padding: 15,
        zIndex: 10, // Above canvas
    },
    backText: { color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', textShadowColor: 'black', textShadowRadius: 2 },
    title: { color: 'white', fontWeight: 'bold', marginLeft: 20, textShadowColor: 'black', textShadowRadius: 2 },

    // LAB STYLES
    labContainer: { flex: 1, backgroundColor: 'black', position: 'relative' },

    // FULLSCREEN CANVAS
    canvasContainer: {
        ...StyleSheet.absoluteFillObject, // Top: 0, Bottom: 0, Left: 0, Right: 0
        zIndex: 1,
    },

    // FLOATING BOTTOM SHEET
    labOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.90)', // Semi-transparent dark blue
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        zIndex: 20,
        paddingBottom: 40 // Safe area
    },
    labTitle: {
        color: '#94a3b8', fontSize: 12, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 8
    },
    labBody: {
        color: '#f1f5f9', fontSize: 16, lineHeight: 24, marginBottom: 20
    },
    nextBtn: {
        backgroundColor: theme.colors.primary, padding: 14, borderRadius: 30, alignItems: 'center'
    },
    nextBtnText: {
        color: 'white', fontWeight: 'bold', letterSpacing: 1
    }
});
