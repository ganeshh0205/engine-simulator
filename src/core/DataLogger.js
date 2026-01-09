/**
 * DataLogger.js - Synthetic Dataset Generator for EduAIThon
 * 
 * Responsibilities:
 * 1. Record high-frequency telemetry from the Physics Engine.
 * 2. Label data frames (Normal, Stall, Overheat, Fire).
 * 3. Export data as CSV for "AI Training" (Rubric Requirement).
 */

export class DataLogger {
    constructor() {
        this.buffer = [];
        this.maxSamples = 10000; // Limit memory usage
        this.isRecording = false;
        this.startTime = 0;
    }

    start() {
        this.buffer = []; // Clear previous run
        this.isRecording = true;
        this.startTime = Date.now();
        console.log("[DataLogger] Recording Started");
    }

    stop() {
        this.isRecording = false;
        console.log(`[DataLogger] Recording Stopped. Captured ${this.buffer.length} frames.`);
    }

    /**
     * Record a single frame of physics state
     * @param {Object} state - The raw physics state from PhysicsEngine
     * @param {Object} anomalies - Current active failures (labels)
     */
    record(state, anomalies = {}) {
        if (!this.isRecording) return;
        if (this.buffer.length >= this.maxSamples) {
            this.stop(); // Auto-stop to prevent crash
            return;
        }

        const t = (Date.now() - this.startTime) / 1000;

        // Flatten the state for CSV
        const frame = {
            time: t.toFixed(3),
            rpm: state.rpm.toFixed(2),
            egt: state.egt.toFixed(2),
            thrust: state.thrust.toFixed(2),
            fuelFlow: state.fuelFlow.toFixed(3),
            vib: state.vibration.toFixed(3),
            compressorP: state.pressureRatio.toFixed(3),
            airflow: state.airflow.toFixed(2),
            // LABELS (The "Target" for AI training)
            label_stall: anomalies.stall ? 1 : 0,
            label_fire: anomalies.fire ? 1 : 0,
            label_surge: anomalies.surge ? 1 : 0
        };

        this.buffer.push(frame);
    }

    /**
     * Convert buffer to CSV and trigger browser download
     * Works in Capacitor via System Browser/Download Manager
     */
    exportCSV() {
        if (this.buffer.length === 0) {
            console.warn("No data to export");
            return;
        }

        const headers = Object.keys(this.buffer[0]).join(",");
        const rows = this.buffer.map(row => Object.values(row).join(","));
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `engine_data_training_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return this.buffer.length;
    }
}

// Singleton Instance
export const dataLogger = new DataLogger();
