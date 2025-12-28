export const LearningData = {
    "Compressor": {
        title: "Axial Compressor",
        description: "The compressor sucks in air and squeezes it to high pressure. It consists of rotating blades (rotors) that push air and stationary vanes (stators) that convert speed into pressure.",
        physics: "Compressing air increases its temperature and pressure, preparing it for efficient combustion. This stage consumes energy from the turbine.",
        stats: [
            { label: "Pressure Ratio", value: "20:1" },
            { label: "Stage Count", value: "8 (simulated)" },
            { label: "Function", value: "Increase Pressure" }
        ]
    },
    "Combustor": {
        title: "Annular Combustor",
        description: "Fuel is injected into the compressed air and ignited. The distinct 'cans' or annular liner contain the flame, mixing air to cool the walls and shape the temperature profile.",
        physics: "Chemical energy is converted into heat energy. The air expands rapidly but is confined, forcing it to accelerate out towards the turbine.",
        stats: [
            { label: "Max Temp", value: "2000 K" },
            { label: "Ignition", value: "Spark / Continuous" },
            { label: "Function", value: "Release Heat" }
        ]
    },
    "Turbine": {
        title: "High-Pressure Turbine",
        description: "Hot, high-velocity gas from the combustor flows through the turbine blades, spinning them at high speed. This rotation drives the compressor via the central shaft.",
        physics: "Extracts energy from the hot gas stream. The pressure and temperature drop across the turbine stages as work is done to spin the shaft.",
        stats: [
            { label: "Inlet Temp", value: "1600 K" },
            { label: "Rotation", value: "Drives Compressor" },
            { label: "Function", value: "Extract Work" }
        ]
    },
    "Fan": {
        title: "Turbofan",
        description: "The large front fan produces the majority of thrust by bypassing air around the engine core. It acts like a giant propeller.",
        physics: "Accelerates a large mass of air by a small amount (F = ma). This is more efficient than the high-speed jet exhaust from the core.",
        stats: [
            { label: "Bypass Ratio", value: "10:1" },
            { label: "Thrust Share", value: "80%" },
            { label: "Function", value: "Propulsion" }
        ]
    }
};
