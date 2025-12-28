
export class PhysicsEngine {
    constructor() {
        // Inputs
        this.inputs = {
            throttle: 0.0, // 0 to 100%
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
        // 1. Ramp RPM based on Throttle
        // Simple lag model
        const targetRPM = this.inputs.throttle;
        const spoolRate = 20.0; // % per second

        if (this.state.rpm < targetRPM) {
            this.state.rpm += spoolRate * dt;
            if (this.state.rpm > targetRPM) this.state.rpm = targetRPM;
        } else if (this.state.rpm > targetRPM) {
            this.state.rpm -= spoolRate * dt;
            if (this.state.rpm < targetRPM) this.state.rpm = targetRPM;
        }

        // 2. Run thermodynamic cycle if running
        if (this.state.rpm > 5.0) { // Idle minimum usually higher, but logic starts here
            this.calculateCycle();
        } else {
            this.resetCycle();
        }
    }

    calculateCycle() {
        const { rpm } = this.state;
        const { altitude, mach, manualAtmosphere, fuelCV, afr } = this.inputs;
        const { cpr, tit, massFlow, efficiency } = this.design; // tit is now a limit, not driver!

        // 0. Ambient Conditions
        let T0, P0;
        if (manualAtmosphere) {
            T0 = this.inputs.ambientTemp;
            P0 = this.inputs.ambientPress;
        } else {
            // Standard Atmosphere
            const altM = altitude * 0.3048;
            T0 = 288.15 - 0.0065 * altM;
            if (T0 < 216.65) T0 = 216.65;
            P0 = 101325 * Math.pow((1 - 0.0000225577 * altM), 5.2559);
            this.inputs.ambientTemp = T0;
            this.inputs.ambientPress = P0;
        }
        let rho0 = P0 / (this.R * T0);
        this.inputs.ambientDensity = rho0;
        this.state.airDensityInlet = rho0;

        // 2. Intake
        const r = Math.pow(1 + 0.2 * mach * mach, 3.5);
        const P2 = P0 * r;
        const T2 = T0 * (1 + 0.2 * mach * mach);

        // --- TURBOFAN SPLIT ---
        // Calc Mass Flow
        let rhoInlet = P2 / (this.R * T2);
        const totalMassFlow = massFlow * (rhoInlet / 1.225) * (rpm / 100);

        const bpr = this.design.bypassRatio || 0; // 0 for Turbojet
        const m_core = totalMassFlow / (1 + bpr);
        const m_bypass = totalMassFlow - m_core;
        // 3. Compressor
        // PR scales with RPM
        // Simple scaling: PR = 1 + (DesignPR - 1) * (RPM/100)^2
        const currentPR = 1 + (cpr - 1) * Math.pow(rpm / 100, 2);

        // --- TYPE SPECIFIC LOGIC ---
        let P3, T3;

        if (this.design.bypassRatio === undefined) this.design.bypassRatio = 0; // Default

        // 3a. RAMJET Logic
        if (cpr < 2.0 && this.design.type === 'Ramjet') {
            // Ramjet relies fully on P2 (Ram Pressure)
            // No compressor.
            P3 = P2 * 0.95; // Pressure recovery loss
            T3 = T2;
        }
        // 3b. ROCKET Logic
        else if (this.design.type === 'Rocket') {
            // Rocket ignores intake
            // Chamber Pressure is fixed by turbopump (Throttle dependent)
            // P3 = Chamber Pressure
            P3 = 3000000 * (rpm / 100.0); // 30 Bar max
            T3 = 300; // Propellant temp?

            // Combustor creates massive Pressure/Temp
            this.inputs.ambientDensity = 0.0; // Space compatible (no drag calc used here directly)
        }
        else {
            // Standard Turbojet/Fan
            P3 = P2 * currentPR;
            // T3 ideal = T2 * PR^((g-1)/g)
            // T3 real = T2 * (1 + (PR^0.286 - 1) / eff)
            const tempRatio = 1 + (Math.pow(currentPR, 0.286) - 1) / efficiency.comp;
            T3 = T2 * tempRatio;
        }

        // 4. Combustor
        const P4 = P3 * efficiency.comb * this.inputs.chamberDiffuser;
        const combustionIntensity = 0.6 + 0.4 * (rpm / 100.0);

        // Heat added to CORE mass flow only
        // q = (Fuel / m_core) * CV? 
        // User AFR is usually defined as Core AFR for combustion stability.
        // So fuelFlow = m_core / afr.
        const fuelFlowVal = m_core / afr;

        // Temperature Rise
        // q = (1/AFR) * CV * eff
        const q_comb = (1.0 / afr) * fuelCV * efficiency.comb * combustionIntensity;
        let T4 = T3 + (q_comb / this.CP);

        // 5. Turbine
        // Work Balance: Turbine drives Core Comp AND Fan (if Turbofan) across shafts
        // For simple model, assume "Gas Generator" drives everything.
        // Work Required = W_comp_core + W_fan

        // Fan Settings (Simplified)
        const fpr = 1.6; // Fan Pressure Ratio (Typical for high bypass)
        const currentFPR = 1 + (fpr - 1) * Math.pow(rpm / 100, 2); // Scale with RPM

        const coreCompWork = m_core * this.CP * (T3 - T2);

        let fanWork = 0;
        if (bpr > 0) {
            // Work to compress Bypass Air
            // T_fan_exit = T2 * (1 + (FPR^0.286 - 1)/eff_fan)
            const T_bypass_exit = T2 * (1 + (Math.pow(currentFPR, 0.286) - 1) / 0.9); // 0.9 Fan Eff
            fanWork = m_bypass * this.CP * (T_bypass_exit - T2);
        }

        const totalWorkReq = coreCompWork + fanWork;

        // Turbine Drop (acting on m_core)
        // m_core * CP * (T4 - T5) = TotalWork / mech_eff
        let turbDeltaT = 0;
        if (m_core > 0.001) {
            turbDeltaT = (totalWorkReq / 0.99) / (m_core * this.CP);
        }
        const T5 = T4 - turbDeltaT;

        // Check if Turbine Choked/Stalled (T5 < T0?)
        // If T5 drops too low, engine stalls (Not enough energy).

        const pressureRatioTurb = Math.pow(T5 / T4, 3.5);
        const P5 = P4 * pressureRatioTurb;

        // 8. Core Nozzle
        const P8 = P0;
        let T8 = T5 * Math.pow(P8 / P5, 0.286);
        if (T8 > T5) T8 = T5; // Physics limits
        if (T8 < T0) T8 = T0;

        let v_core = Math.sqrt(2 * this.CP * (T5 - T8) * efficiency.nozzle);
        v_core /= this.inputs.nozzleArea; // Valve Logic

        // --- BYPASS NOZZLE ---
        let v_bypass = 0;
        if (bpr > 0) {
            // Expand Bypass Air from P_fan (P2 * FPR) to P0
            const P_fan_exit = P2 * currentFPR;
            // V_bypass = sqrt(2 * CP * T_bypass_exit * (1 - (P0/P_fan)^...))
            // Re-calc T_bypass_exit
            const T_bypass_exit = T2 * (1 + (Math.pow(currentFPR, 0.286) - 1) / 0.9);

            // Isentropic Expansion
            // T_bypass_nozzle = T_bypass_exit * (P0 / P_fan_exit)^0.286
            let T_bypass_stat = T_bypass_exit * Math.pow(P0 / P_fan_exit, 0.286);
            if (T_bypass_stat > T_bypass_exit) T_bypass_stat = T_bypass_exit; // No expansion if P0 > P_fan

            v_bypass = Math.sqrt(2 * this.CP * (T_bypass_exit - T_bypass_stat) * 0.95);
        }

        // Total Thrust
        // F = m_core * v_core + m_bypass * v_bypass
        const F_core = m_core * v_core;
        const F_bypass = m_bypass * v_bypass;
        const Fg = F_core + F_bypass;

        const Vflight = mach * 340.3;
        const Fram = totalMassFlow * Vflight;
        const Fn = Fg - Fram;

        // Update Stations
        this.stations[0] = { P: P0, T: T0 };
        this.stations[2] = { P: P2, T: T2 };
        this.stations[3] = { P: P3, T: T3 };
        this.stations[4] = { P: P4, T: T4 };
        this.stations[5] = { P: P5, T: T5 };
        this.stations[8] = { P: P8, T: T8 };

        // Output State
        this.state.thrust = Math.max(0, Fn);
        this.state.egt = T5;
        this.state.tsfc = (fuelFlowVal / Fn) * 3600;
        this.state.fuelFlow = fuelFlowVal;
        this.state.exitVelocity = v_core; // Core velocity for particles
        this.state.p3 = P3;
        this.state.t4 = T4;
    }

    resetCycle() {
        this.state.thrust = 0;
        this.state.egt = 288.15;
        this.state.exitVelocity = 0;
        this.state.p3 = 101325;
        this.state.t4 = 288.15;
    }
}
