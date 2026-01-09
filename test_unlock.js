
import { dbManager } from './src/core/DatabaseManager.js';
import { CURRICULUM } from './src/data/curriculum-data.js';

console.log("--- VERIFYING UNLOCK LOGIC ---");

// 1. Get Last Module of Chapter 1
const ch1 = CURRICULUM[0];
const lastModC1 = ch1.modules[ch1.modules.length - 1];
console.log("Last Module Ch1:", lastModC1.id);

// 2. Get First Module of Chapter 2
const ch2 = CURRICULUM[1];
const firstModC2 = ch2.modules[0];
console.log("First Module Ch2:", firstModC2.id);

// 3. Mock User
const mockUser = {
    username: "test_unlocker",
    email: "unlock@test.com",
    password: "123",
    name: "Unlocker"
};

dbManager.register(mockUser);
const loginRes = dbManager.login("test_unlocker", "123");
console.log("Login Success:", loginRes.success);

if (loginRes.success) {
    console.log("Initial Status Ch2M1:", dbManager.getModuleStatus(firstModC2.id));

    // 4. Complete Last Mod C1
    console.log("Completing", lastModC1.id);
    dbManager.completeModule(lastModC1.id);

    // 5. Check Status Ch2M1
    const newStatus = dbManager.getModuleStatus(firstModC2.id);
    console.log("New Status Ch2M1:", newStatus);

    if (newStatus === 'unlocked' || newStatus === 'completed') {
        console.log("PASS: Logic works.");
    } else {
        console.error("FAIL: Module did not unlock.");
    }
}
