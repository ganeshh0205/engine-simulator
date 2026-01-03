
export class PhysicsEngine {
    constructor() {
        // Inputs
        this.inputs = {
            throttle: 0.0, // 0 to 100%
            ignition: false, // Engine Start/Stop State
            mach: 0.0,     // Flight Mach Number
            altitude: 0.0, // Feet (Standard Atmosphere)

            // Advanced Physics Inputs
            manualAtmosphere: false, // Override altitude-based ambient
            ambientTemp: 288.15,     // K
            ambientPress: 101325,    // Pa
            ambientDensity: 1.225,   // kg/m^3

            fuelCV: 43.0e6,          // J/kg (Kerosene ~43MJ/kg)
            afr: 60.0,               // Air Fuel Ratio (Overall).
            injectionPressure: 30.0, // Bar
            chamberVolume: 0.5,      // m^3
            nozzleArea: 1.0,         // Scale Factor (1.0 = Design)
            chamberDiffuser: 1.0     // Scale Factor (Pressure Loss modifier)
        };

        // Engine Design Parameters (Sea Level Static)
        this.design = {
            massFlow: 15.0,    // kg/s
            cpr: 12.0,         // Compressor Pressure Ratio
            tit: 1400.0,       // Turbine Inlet Temp Limit (K)
            efficiency: {
                comp: 0.85,
                turb: 0.90,
                comb: 0.98,
                nozzle: 0.95
            },
            bypassRatio: 0.0 // Turbojet
        };

        // Engine State (Computed)
        this.state = {
            rpm: 0.0,       // % RPM
            thrust: 0.0,    // Newtons
            egt: 288.15,    // Kelvin (Exhaust Gas Temp)
            tsfc: 0.0,      // kg/(N*h)
            fuelFlow: 0.0,  // kg/s

            // New Outputs
            exitVelocity: 0.0, // m/s
            p3: 0.0,           // Compressor Exit / Combustor Inlet (Pa)
            t4: 0.0,           // Combustor Exit Temp (K)
            airDensityInlet: 0.0 // kg/m^3
        };

        // Thermodynamic Stations (Gas Properties)
        // 0: Ambient, 2: Comp Inlet, 3: Comp Exit, 4: Combustor, 5: Turbine Exit, 8: Nozzle
        this.stations = {
            0: { P: 101325, T: 288.15 },
            2: { P: 101325, T: 288.15 },
            3: { P: 101325, T: 288.15 },
            4: { P: 101325, T: 288.15 },
            5: { P: 101325, T: 288.15 },
            8: { P: 101325, T: 288.15 }
        };

        // Physical Constants
        this.GAMMA = 1.4;
        this.CP = 1004.0; // J/(kg*K)
        this.R = 287.05;  // Specific Gas Constant
    }

    update(dt) {
        // --- REALISTIC ENGINE DYNAMICS CONTROLLER ---

        // 1. Determine Target RPM based on State
        let commandRPM = 0.0;

        if (this.inputs.ignition) {
            // Engine is ON
            // IDLE is typically 60% N1 for a pure turbojet
            const IDLE_RPM = 60.0;

            // Map Throttle (0-100%) to Operational Range (IDLE - 100%)
            // 0% Throttle = IDLE
            // 100% Throttle = 100% RPM
            commandRPM = IDLE_RPM + (this.inputs.throttle / 100.0) * (100.0 - IDLE_RPM);

            // Starter Assistance (simulated)
            // If RPM is low, Starter Motor drives it to ~20%
            if (this.state.rpm < 20.0) {
                // Starter torque is high, moves fast to 20%
                commandRPM = Math.max(commandRPM, 20.0);
            }
        } else {
            // Engine is OFF
            commandRPM = 0.0; // Spool down
        }

        // 2. Calculate Response Rate (Inertia Simulation)
        let responseRate = 0.0;
        const currentRPM = this.state.rpm;
        const diff = commandRPM - currentRPM;

        // Spool Up/Down Physics
        if (diff > 0) {
            // Accelerating
            if (currentRPM < 20.0 && this.inputs.ignition) {
                // Starter Motor: Strong Torque
                responseRate = 25.0; // %/sec
            } else if (currentRPM < 50.0 && this.inputs.ignition) {
                // Light-off / Weak acceleration band (Components heavy)
                responseRate = 18.0;
            } else {
                // Active Governor (Fuel Control Unit)
                // Fast response in power band
                responseRate = 40.0;
            }
        } else {
            // Decelerating (Drag/Friction)
            if (currentRPM > 20.0) {
                // Aerodynamic Drag is high at speed
                responseRate = 25.0;
            } else {
                // Mechanical Friction dominates at low speed
                responseRate = 10.0;
            }
        }

        // 3. Apply Integration
        // Simple Euler integration for Smooth Lag
        if (Math.abs(diff) < 0.1) {
            this.state.rpm = commandRPM;
        } else {
            const sign = Math.sign(diff);
            this.state.rpm += sign * responseRate * dt;

            // Clamp to target if overshot
            if (sign > 0 && this.state.rpm > commandRPM) this.state.rpm = commandRPM;
            if (sign < 0 && this.state.rpm < commandRPM) this.state.rpm = commandRPM;
        }

        // Density Scaling Effect on N1 (Physical Load)
        // High Altitude (Low Density) -> Less Aerodynamic Drag -> Slightly faster spool?
        // Or Fuel Control Unit handles it. Kept simple for now.

        // 4. Run Cycle Calculations
        // Only valid if rotating
        if (this.state.rpm > 1.0) {
            this.calculateCycle();
        } else {
            this.resetCycle();
        }
    }

    calculateCycle() {
        // STRICT 0-D CALCULATION CHAIN (USER VALIDATED)
        const { rpm } = this.state; // 0-100%
        let { altitude, mach, manualAtmosphere } = this.inputs;

        // 0. CONSTANTS
        const GAMMA = 1.4;
        const CP = 1005.0; // J/kgK
        const R = 287.0;   // J/kgK
        const LHV = 43.0e6; // J/kg
        const RHO_SL = 1.225;
        // User Specs:
        const M_DOT_SL_MAX = 12.0; // kg/s
        const M_DOT_FUEL_MAX = 0.20; // kg/s

        // 1. AMBIENT & INLET
        let P0, T0;
        if (!manualAtmosphere) {
            // Standard Atmosphere
            const h = altitude * 0.3048; // meters
            if (h < 11000) {
                T0 = 288.15 - 0.0065 * h;
                P0 = 101325 * Math.pow(1 - 0.0000225577 * h, 5.25588);
            } else {
                T0 = 216.65;
                P0 = 22632 * Math.exp(-0.0001577 * (h - 11000));
            }
        } else {
            P0 = this.inputs.ambientPress;
            T0 = this.inputs.ambientTemp;
        }

        // 1.1 Air Density
        const rho0 = P0 / (R * T0);

        // Update UI Inputs for feedback
        this.inputs.ambientPress = P0;
        this.inputs.ambientTemp = T0;
        this.inputs.ambientDensity = rho0;
        this.state.airDensityInlet = rho0;

        // 1.2 Inlet Velocity
        const V0 = mach * Math.sqrt(GAMMA * R * T0);

        // 2. THROTTLE -> SPOOL SPEED (N1)
        // N1 (0.0 - 1.0)
        let N1 = this.state.rpm / 100.0;
        if (N1 < 0) N1 = 0;

        // 3. AIR MASS FLOW
        // m_dot = m_sl_max * N1 * (rho0 / rho_sl)
        let m_a = M_DOT_SL_MAX * N1 * (rho0 / RHO_SL);
        if (m_a < 0.001) m_a = 0;

        // 4. COMPRESSOR
        // 4.1 Pressure Ratio: pi_c = 1 + 8 * N1^3.5 (Lower PR at idle for realistic thrust)
        const pi_c = 1.0 + 8.0 * Math.pow(N1, 3.5);

        // 4.2 Exit Pressure
        const P3 = P0 * pi_c;

        // 4.3 Exit Temp (Isentropic)
        // T3 = T0 * pi_c^((g-1)/g)
        const T3 = T0 * Math.pow(pi_c, (GAMMA - 1) / GAMMA);

        // 5. FUEL FLOW
        // Realistic Schedule: N^2 scaling (Leans out at idle)
        let m_f = 0;
        if (this.inputs.ignition && N1 > 0.05) {
            m_f = M_DOT_FUEL_MAX * Math.pow(N1, 2.0);
        }

        // 6. COMBUSTION
        let T4 = T3;
        if (m_a > 0.001) {
            // Efficiency checks
            let q_comb = (m_f * LHV) / (m_a * CP);
            // Low RPM efficiency penalty
            if (N1 < 0.6) q_comb *= 0.9;

            T4 = T3 + q_comb;
        }
        // Material Limit
        if (T4 > 2200) T4 = 2200;

        // 7. TURBINE
        // 7.1 Compressor Work: Wc = CP * (T3 - T0)
        // (Note: User formula specified T0, keeping simple)
        const Wc = CP * (T3 - T0);

        // 7.2 Turbine Drop
        const delta_Tt = Wc / CP;

        // 7.3 EGT (T5)
        let T5 = T4 - delta_Tt;
        // Clamp physical limit
        if (T5 < T0) T5 = T0;

        // 8. NOZZLE
        // 8.1 Pressure at Turbine Exit (P5)
        // Assume Turbine Expansion is linked to Temp Drop Isentropically
        // P5 = P4 * (T5 / T4)^(g/(g-1))
        const g_exp = GAMMA / (GAMMA - 1);
        let P5 = P3 * Math.pow(T5 / T4, g_exp);

        // Nozzle Pressure Ratio (NPR) = P5 / P0
        const NPR = P5 / P0;

        // 8.2 Jet Velocity
        // Ideally expanded to P0 (if NPR > 1)
        let Vj = 0;
        let T8 = T5; // Static Temp at Exit

        if (NPR > 1.0) {
            // Unchoked / Choked Logic (Simplified: Perfect Expansion to P0 or P_crit)
            // For simple turbojet signal, assume expansion to P0 for now (Convergent-Divergent Ideal)

            // T8 = T5 * (1 / NPR)^((g-1)/g)
            T8 = T5 * Math.pow(1.0 / NPR, (GAMMA - 1) / GAMMA);

            // Velocity = sqrt(2 * CP * (T5 - T8))
            // Check for valid delta
            const dH = Math.max(0, T5 - T8);
            Vj = Math.sqrt(2 * CP * dH);
        } else {
            // No pressure deficit to drive flow? 
            // Subsonic entrainment or just negligible.
            Vj = 0;
        }

        // 8.2 Area Effect
        if (this.inputs.nozzleArea > 0.1) {
            Vj = Vj / Math.sqrt(this.inputs.nozzleArea);
        }

        // 9. THRUST
        // F = m_a * (Vj - V0)
        let Fn = m_a * (Vj - V0);
        if (Fn < 0) Fn = 0;

        // 10. TSFC
        // TSFC = (m_f / F) * 3600 * 1000
        let tsfc = 0.0;
        if (Fn > 10.0) { // Avoid noise at idle
            tsfc = (m_f / Fn) * 3600.0 * 1000.0;
        }

        // UPDATE STATE
        this.state.thrust = Fn;

        // EGT Thermal Lag (Simulate Metal Mass)
        // Move towards Target T5 slowly
        // lag factor ~ 2.0 * dt? 
        // We don't have dt here. Assuming 60fps (dt ~0.016).
        // Let's use a simple distinct filter if we don't have dt.
        // Actually, calculateCycle doesn't take dt.
        // We'll rely on it being called every frame.
        // Target is T5.
        // Current is this.state.egt.
        // alpha = 0.05 (Slow), 0.5 (Fast).
        const alpha = 0.05;
        this.state.egt = this.state.egt + alpha * (T5 - this.state.egt);

        this.state.fuelFlow = m_f;
        this.state.tsfc = tsfc;
        this.state.exitVelocity = Vj;
        this.state.p3 = P3;
        this.state.t4 = T4;

        // Output Stations for Plots
        this.stations[0] = { P: P0, T: T0 };
        this.stations[2] = { P: P0, T: T0 };
        this.stations[3] = { P: P3, T: T3 };
        this.stations[4] = { P: P3, T: T4 };
        this.stations[5] = { P: P0, T: T5 };
        this.stations[8] = { P: P0, T: T5 };
    }

    resetCycle() {
        this.state.thrust = 0;
        this.state.egt = 288.15;
        this.state.exitVelocity = 0;
        this.state.p3 = 101325;
        this.state.t4 = 288.15;
    }
}
