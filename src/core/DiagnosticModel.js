/**
 * DiagnosticModel.js - The "Brain" of the AI System
 * 
 * Responsibilities:
 * 1. Anomaly Detection (Rule-based + Probabilistic).
 * 2. Prediction (Will the engine fail soon?).
 * 3. Root Cause Analysis (Explainable AI).
 */

export class DiagnosticModel {
    constructor() {
        this.confidence = 0.0;
        this.status = "NOMINAL";
        this.history = [];
        this.totalPredictions = 0;
        this.correctPredictions = 0;
    }

    /**
     * Run inference on current telemetry
     * @param {Object} state - Physics State
     * @returns {Object} Prediction Result
     */
    predict(state) {
        let riskScore = 0.0;
        let reasons = [];

        // FEATURE 1: EGT Analysis (Combustion Health)
        const egtNorm = state.egt / 1400.0; // Normalize by Limit
        if (egtNorm > 0.8) {
            riskScore += (egtNorm - 0.8) * 2.0; // Non-linear ramp
            reasons.push(`EGT High (${state.egt.toFixed(0)}K)`);
        }

        // FEATURE 2: Compressor Stability (Stall Margin)
        // Ratio of RPM (Load) to Airflow (Supply)
        // High RPM + Low Airflow = Danger
        const flowRatio = state.airflow / (state.rpm + 1.0);
        if (state.rpm > 50.0 && flowRatio < 0.15) {
            riskScore += 0.4;
            reasons.push("Low Stall Margin");
        }

        // FEATURE 3: Vibration (Simulated Inference)
        // High Vibration usually means imbalance or surge
        if (state.vibration > 0.5) {
            riskScore += 0.3;
            reasons.push("High Vibration detected");
        }

        // FEATURE 4: Overspeed (Structural Integrity)
        if (state.rpm > 102.0) {
            riskScore += 1.0; // Immediate Critical
            reasons.push("N1 Overspeed (>102%)");
        }

        // FEATURE 5: Flameout / Ignition Fail
        if (state.fuelFlow > 0.05 && state.egt < 400.0 && state.rpm < 20.0) {
            riskScore += 0.8;
            reasons.push("Ignition Failure / Flameout");
        }

        // OUTPUT LOGIC (Deterministic Classification)
        let prediction = {
            status: "NOMINAL",
            confidence: 0.98, // High confidence in normal operation
            reasons: []
        };

        if (riskScore > 0.6) {
            prediction.status = "CRITICAL";
            // Confidence scales with how deep we are into the danger zone
            prediction.confidence = Math.min(0.99, 0.85 + (riskScore * 0.1));
        } else if (riskScore > 0.3) {
            prediction.status = "WARNING";
            prediction.confidence = 0.75; // Moderate confidence in warning
        }

        // METRICS TRACKING (Real-time Evaluation)
        this.totalPredictions++;
        // Ground Truth Comparison:
        // If Risk > 0.6, we EXPECT "CRITICAL". 
        // If Risk > 0.3, we EXPECT "WARNING". 
        // Else "NOMINAL".
        // Note: In a real scenario, Ground Truth relies on actual failure flags (state.isFailed).
        // Here we validate the Model logic against the Physics truth.

        let groundTruth = "NOMINAL";
        if (state.egt > 950 || state.rpm > 105) groundTruth = "CRITICAL";
        else if (state.egt > 850 || state.rpm > 98) groundTruth = "WARNING";

        // Check Agreement
        if (prediction.status === groundTruth) {
            this.correctPredictions++;
        }

        prediction.metrics = {
            accuracy: this.totalPredictions > 0 ? (this.correctPredictions / this.totalPredictions) : 1.0,
            samples: this.totalPredictions
        };

        prediction.reasons = reasons;
        // Rolling average for stability
        this.history.push({ t: Date.now(), pred: prediction.confidence });
        if (this.history.length > 50) this.history.shift();

        return prediction;
    }

    resetMetrics() {
        this.totalPredictions = 0;
        this.correctPredictions = 0;
    }
    predictRUL(state) {
        // Predictive Maintenance: Estimate Remaining Useful Life (RUL)
        // Focus on EGT (Exhaust Gas Temp) as the critical failure mode.
        const CRITICAL_EGT = 1200; // Kelvin

        // 1. Buffer Management
        if (!this.egtBuffer) this.egtBuffer = [];
        this.egtBuffer.push({ t: Date.now(), val: state.egt });
        if (this.egtBuffer.length > 30) this.egtBuffer.shift(); // 0.5 sec window @ 60fps

        // 2. Trend Analysis (Linear Regression)
        if (this.egtBuffer.length < 10) return null; // Need data ranges

        const start = this.egtBuffer[0];
        const end = this.egtBuffer[this.egtBuffer.length - 1];

        const dt = (end.t - start.t) / 1000; // seconds
        if (dt === 0) return null;

        const dEGT = end.val - start.val;
        const slope = dEGT / dt; // deg K per second

        // 3. Prediction
        if (slope > 5.0 && state.egt < CRITICAL_EGT) {
            // Rising fast
            const margin = CRITICAL_EGT - state.egt;
            const timeToFailure = margin / slope; // seconds
            return {
                parameter: "EGT",
                seconds: timeToFailure,
                trend: slope
            };
        }

        return null; // Stable or cooling
    }
}

export const diagnosticModel = new DiagnosticModel();
