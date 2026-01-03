import { Chapter1 } from "./Chapter1Content.js";
import { Chapter2 } from "./Chapter2Content.js";

// Unified Curriculum Source
// This ensures DatabaseManager and MentorView use the EXACT same IDs.

export const CURRICULUM = [
    {
        id: "c1",
        title: Chapter1.title,
        modules: Chapter1.modules.map(m => ({
            id: m.id,
            title: m.title,
            // DatabaseManager only needs ID and Title really, 
            // but we can pass other metadata if needed.
        }))
    },
    {
        id: "c2",
        title: Chapter2.title,
        modules: Chapter2.modules.map(m => ({
            id: m.id,
            title: m.title
        }))
    }
];
