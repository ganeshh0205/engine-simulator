import { CURRICULUM } from "../data/curriculum-data.js";

export class DatabaseManager {
    constructor() {
        this.STORAGE_KEY_USERS = 'propulse_users';
        this.STORAGE_KEY_PROGRESS = 'propulse_progress';
        this.STORAGE_KEY_SESSION = 'propulse_session';
        this.currentUser = null;

        // Load session if exists
        this.restoreSession();
    }

    // --- Helpers ---
    _getUsers() {
        try {
            const d = localStorage.getItem(this.STORAGE_KEY_USERS);
            return d ? JSON.parse(d) : [];
        } catch (e) {
            console.error("Data integrity error (users):", e);
            return [];
        }
    }

    _saveUsers(users) {
        localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    }

    _getProgressData() {
        try {
            const d = localStorage.getItem(this.STORAGE_KEY_PROGRESS);
            return d ? JSON.parse(d) : {};
        } catch (e) {
            console.error("Data integrity error (progress):", e);
            // Backup/Reset if corrupted? For now return empty.
            return {};
        }
    }

    _saveProgressData(data) {
        localStorage.setItem(this.STORAGE_KEY_PROGRESS, JSON.stringify(data));
    }

    // --- Validation ---
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // --- Auth ---
    register(data) {
        // data: { username, password, email, name }
        const users = this._getUsers();

        // Normalize inputs for comparison
        const normUser = data.username.toLowerCase().trim();
        const normEmail = data.email.toLowerCase().trim();

        if (users.find(u => u.username.toLowerCase() === normUser)) {
            return { success: false, message: "Username already taken." };
        }
        if (users.find(u => u.email.toLowerCase() === normEmail)) {
            return { success: false, message: "Email already registered." };
        }

        const newUser = {
            id: 'user_' + Date.now(),
            name: data.name,
            username: data.username,
            email: data.email,
            password: data.password,
            joinedAt: new Date().toISOString()
        };

        users.push(newUser);
        this._saveUsers(users);

        // Initialize Progress
        this._initUserProgress(newUser.id);

        this.login(data.username, data.password);
        return { success: true };
    }

    login(identifier, password) {
        // Identifier can be username OR email
        const users = this._getUsers();
        const user = users.find(u => (u.username === identifier || u.email === identifier) && u.password === password);

        if (user) {
            this.currentUser = user;
            localStorage.setItem(this.STORAGE_KEY_SESSION, JSON.stringify(user));
            // Ensure progress exists (fixes missing data for legacy users)
            this._ensureUserProgress(user.id);
            return { success: true };
        }
        return { success: false, message: "Invalid credentials" };
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.STORAGE_KEY_SESSION);
        // Force reload to clear all in-memory application state (Modules, Scenes, Physics)
        window.location.reload();
    }

    restoreSession() {
        try {
            const session = localStorage.getItem(this.STORAGE_KEY_SESSION);
            if (session) {
                this.currentUser = JSON.parse(session);
                // Ensure progress exists
                if (this.currentUser && this.currentUser.id) {
                    this._ensureUserProgress(this.currentUser.id);
                }
            }
        } catch (e) {
            console.warn("Session restore failed:", e);
            localStorage.removeItem(this.STORAGE_KEY_SESSION);
        }
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // --- GAMIFICATION ---
    getXP() {
        return parseInt(localStorage.getItem("engine_sim_xp") || "0");
    }

    addXP(amount) {
        // Visual Notification
        const visual = document.createElement("div");
        visual.innerText = `+${amount} XP`;
        Object.assign(visual.style, {
            position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
            color: "#fbbf24", fontWeight: "bold", fontSize: "2rem", zIndex: "9999",
            textShadow: "0 4px 10px rgba(0,0,0,0.5)", animation: "floatUp 1s ease-out forwards"
        });
        document.body.appendChild(visual);

        if (!document.getElementById("xp-anim-style")) {
            const style = document.createElement("style");
            style.id = "xp-anim-style";
            style.innerHTML = `@keyframes floatUp { 0% { opacity:1; transform:translate(-50%, 0); } 100% { opacity:0; transform:translate(-50%, -50px); } }`;
            document.head.appendChild(style);
        }
        setTimeout(() => visual.remove(), 1000);

        // Logic
        const current = this.getXP();
        localStorage.setItem("engine_sim_xp", (current + amount).toString());
    }

    // --- Progress ---
    _ensureUserProgress(userId) {
        const data = this._getProgressData();
        const userProg = data[userId];

        // Check 1: User exists?
        if (!userProg) {
            console.log("Initializing new user progress:", userId);
            this._initUserProgress(userId);
            return;
        }

        // Check 2: Stale Data? (Does the first module of the current curriculum exist?)
        // If we changed IDs (m0 -> motion), the old data is useless.
        const firstModuleId = CURRICULUM[0].modules[0].id;
        if (!userProg[firstModuleId]) {
            console.log("Detected stale/legacy progress data. Re-initializing schema.");
            // We could try to migrate, but for now, re-init to ensure consistency.
            this._initUserProgress(userId);
        }
    }

    _initUserProgress(userId) {
        const data = this._getProgressData();
        // Warn: This resets progress!
        const userProg = {};

        // Flatten Curriculum to find first module
        let firstFound = false;

        CURRICULUM.forEach(phase => {
            phase.modules.forEach(mod => {
                if (!firstFound) {
                    userProg[mod.id] = { status: 'unlocked', score: 0 };
                    firstFound = true;
                } else {
                    userProg[mod.id] = { status: 'locked', score: 0 };
                }
            });
        });

        data[userId] = userProg;
        this._saveProgressData(data);
    }

    getModuleStatus(moduleId) {
        if (!this.currentUser) return 'locked';
        const data = this._getProgressData();
        const userProg = data[this.currentUser.id] || {};

        // Safety check if new modules added since user created logic
        if (!userProg[moduleId]) return 'locked';
        return userProg[moduleId].status;
    }

    completeModule(moduleId) {
        if (!this.currentUser) return;
        const data = this._getProgressData();
        const userProg = data[this.currentUser.id];

        if (userProg && userProg[moduleId]) {
            userProg[moduleId].status = 'completed';

            // Auto-Unlock Next
            // Build flat list of IDs
            const allIds = [];
            CURRICULUM.forEach(p => p.modules.forEach(m => allIds.push(m.id)));

            const idx = allIds.indexOf(moduleId);
            if (idx >= 0 && idx < allIds.length - 1) {
                const nextId = allIds[idx + 1];
                // Unconditionally unlock next module if it exists
                if (!userProg[nextId]) {
                    // If data missing (migration issue), init it
                    userProg[nextId] = { status: 'locked', score: 0 };
                }
                userProg[nextId].status = 'unlocked';
            }

            this._saveProgressData(data);
        }
    }
    getStudentProgress() {
        if (!this.currentUser) return null;
        const data = this._getProgressData();
        return data[this.currentUser.id] || {};
    }
}

export const dbManager = new DatabaseManager();
