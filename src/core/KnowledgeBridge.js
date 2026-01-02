export class KnowledgeBridge {
    constructor() {
        this.state = {
            // User's current academic focus
            currentConcept: "thrust_basics",

            // What the AI suggests the user do in the Lab
            labSuggestion: {
                active: false,
                id: null,
                hypothesis: "",
                parameters: {} // e.g. { throttle: 100 }
            },

            // Data returned from the Lab
            labResults: []
        };

        // Load from localStorage if available (Persistence)
        this.load();
    }

    // --- LEARN LAYER METHODS ---

    setSuggestion(id, hypothesis, parameters) {
        this.state.labSuggestion = {
            active: true,
            id,
            hypothesis,
            parameters
        };
        this.save();
        console.log("[Bridge] New Suggestion Set:", this.state.labSuggestion);
    }

    getLatestResults() {
        return this.state.labResults;
    }

    clearSuggestion() {
        this.state.labSuggestion.active = false;
        this.save();
    }

    // --- LAB LAYER METHODS ---

    getSuggestion() {
        return this.state.labSuggestion;
    }

    logResult(experimentId, data) {
        const result = {
            timestamp: Date.now(),
            experimentId,
            data // e.g. { rpm: 98, thrust: 24000 }
        };
        this.state.labResults.push(result);
        this.save();
        console.log("[Bridge] Result Logged:", result);
    }

    // --- PERSISTENCE ---
    save() {
        try {
            localStorage.setItem("propulse_bridge", JSON.stringify(this.state));
        } catch (e) { console.warn("Storage failed", e); }
    }

    load() {
        const data = localStorage.getItem("propulse_bridge");
        if (data) {
            this.state = JSON.parse(data);
        }
    }
}

// Singleton Instance
export const bridge = new KnowledgeBridge();
