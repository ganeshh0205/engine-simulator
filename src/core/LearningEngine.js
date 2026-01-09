/**
 * LearningEngine.js - The AI Pedagogical Mentor
 * 
 * Responsibilities:
 * 1. Translate technical anomalies into educational feedback.
 * 2. Provide "Just-in-Time" learning advice.
 * 3. Adapt difficulty based on pilot proficiency (EduAIThon "Innovation").
 */

import { diagnosticModel } from "./DiagnosticModel";

export class LearningEngine {
    constructor(physicsEngine) {
        this.pe = physicsEngine;
        this.lastAdviceTime = 0;
        this.cooldown = 10000; // 10 seconds between tips
        this.consecutiveCleanObj = 0; // Frames without errors
    }

    /**
     * Evaluate the current situation and return a Mentor Message
     * @returns {Object|null} { title, message, type }
     */
    evaluate() {
        const now = Date.now();
        if (now - this.lastAdviceTime < this.cooldown) return null;

        // 1. Get Technical Diagnosis
        const prediction = diagnosticModel.predict(this.pe.state);

        // 2. Translate to Pedagogy
        if (prediction.status === "CRITICAL") {
            this.lastAdviceTime = now;
            this.consecutiveCleanObj = 0;

            if (prediction.reasons.some(r => r.includes("Stall"))) {
                return {
                    type: "alert",
                    title: "⚠ COMPRESSOR STALL DETECTED",
                    message: "The airflow cannot follow the blades! **Lesson**: You increased throttle too fast at low speed. Reduce throttle and spool up slowly."
                };
            } else if (prediction.reasons.some(r => r.includes("Overspeed"))) {
                return {
                    type: "alert",
                    title: "🚨 N1 OVERSPEED",
                    message: "Centrifugal forces are critical! **Lesson**: Reduce throttle immediately. 100% is the mechanical limit."
                };
            } else if (prediction.reasons.some(r => r.includes("Ignition"))) {
                return {
                    type: "alert",
                    title: "❌ IGNITION FAILURE",
                    message: "Fuel is dumping but no fire! **Lesson**: You need the Starter Motor (RPM > 15%) + Ignition ON before adding fuel."
                };
            } else if (prediction.reasons.some(r => r.includes("EGT"))) {
                return {
                    type: "alert",
                    title: "🔥 OVERHEAT WARNING",
                    message: "Turbine blades are melting! **Lesson**: High load + High Altitude = Less Cooling. Watch your T4 limit."
                };
            } else {
                return {
                    type: "alert",
                    title: "CRITICAL FAILURE",
                    message: `Telemetry indicates ${prediction.reasons[0]}. Abort maneuver immediately.`
                };
            }
        }

        // 3. Positive Reinforcement / Adaptive Challenge
        // If clean for 30 seconds (roughly 1800 frames), challenge the user
        /* 
        this.consecutiveCleanObj++;
        if (this.consecutiveCleanObj > 1000) { // ~16 seconds
            this.lastAdviceTime = now;
            return {
                type: "info",
                title: "EXCELLENT PILOTING",
                message: "Your efficiency is >90%. Try increasing altitude to 40,000ft to test high-altitude relight capability."
            };
        }
        */

        return null; // No advice needed
    }

    updateSkills() {
        // Continuous Knowledge Tracing
        const s = this.pe.state;
        const user = dbManager.getCurrentUser();
        if (!user || !user.skills) return;

        // 1. Thermal Management Skill
        // Penalty for high heat, Reward for staying cool under load
        if (s.egt > 900) user.skills.thermal -= 0.05;
        else if (s.thrust > 5000 && s.egt < 800) user.skills.thermal += 0.01;

        // 2. Efficiency Skill (Low TSFC is good)
        if (s.tsfc > 0 && s.tsfc < 0.8 && s.thrust > 10000) user.skills.efficiency += 0.02;

        // 3. Safety Skill (No Warnings)
        if (this.consecutiveCleanObj > 600) user.skills.safety += 0.01; // Every 10s clean

        // Clamp 0-100
        Object.keys(user.skills).forEach(k => {
            user.skills[k] = Math.max(0, Math.min(100, user.skills[k]));
        });

        // Persist occasionally (debounce handled by called or dbManager)
        dbManager.saveUser(user);
    }
}
