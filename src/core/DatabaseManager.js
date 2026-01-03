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
        const d = localStorage.getItem(this.STORAGE_KEY_USERS);
        return d ? JSON.parse(d) : [];
    }

    _saveUsers(users) {
        localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));
    }

    _getProgressData() {
        const d = localStorage.getItem(this.STORAGE_KEY_PROGRESS);
        return d ? JSON.parse(d) : {};
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

        if (users.find(u => u.username === data.username)) {
            return { success: false, message: "Username already taken." };
        }
        if (users.find(u => u.email === data.email)) {
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
            return { success: true };
        }
        return { success: false, message: "Invalid credentials" };
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.STORAGE_KEY_SESSION);
        window.location.reload();
    }

    restoreSession() {
        const session = localStorage.getItem(this.STORAGE_KEY_SESSION);
        if (session) {
            this.currentUser = JSON.parse(session);
        }
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // --- Progress ---
    _initUserProgress(userId) {
        const data = this._getProgressData();
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
