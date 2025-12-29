export class SimControls {
    constructor(container, onStateChange) {
        this.container = container;
        this.onStateChange = onStateChange;

        this.state = {
            airflow: false,
            fuel: false,
            ignition: false
        };

        this.initUI();
    }

    initUI() {
        this.panel = document.createElement('div');
        this.panel.style.position = 'absolute';
        this.panel.style.bottom = '20px';
        this.panel.style.left = '50%';
        this.panel.style.transform = 'translateX(-50%)';
        this.panel.style.display = 'flex';
        this.panel.style.gap = '15px';
        this.panel.style.padding = '15px 25px';
        this.panel.style.background = 'rgba(0, 0, 0, 0.6)';
        this.panel.style.backdropFilter = 'blur(10px)';
        this.panel.style.borderRadius = '30px';
        this.panel.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        this.panel.style.zIndex = '1000';
        this.panel.style.pointerEvents = 'auto'; // Ensure clicks work

        // 1. Airflow Button
        this.airflowBtn = this.createButton("Airflow", "blue", () => this.toggle("airflow"));
        this.panel.appendChild(this.airflowBtn);

        // 2. Fuel Button
        this.fuelBtn = this.createButton("Fuel Inject", "orange", () => this.toggle("fuel"));
        this.panel.appendChild(this.fuelBtn);

        // 3. Ignition Button
        this.ignBtn = this.createButton("Ignition", "red", () => this.toggle("ignition"));
        this.panel.appendChild(this.ignBtn);

        this.container.appendChild(this.panel);

        // Initial State Sync
        this.updateButtons();
    }

    createButton(text, colorTheme, callback) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.style.padding = '10px 20px';
        btn.style.fontFamily = 'Inter, sans-serif';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = '600';
        btn.style.textTransform = 'uppercase';
        btn.style.border = 'none';
        btn.style.borderRadius = '20px';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.2s ease';
        btn.style.outline = 'none';

        // Data for theming
        btn.dataset.theme = colorTheme;

        // Default Style (Off)
        btn.style.background = 'rgba(255,255,255,0.1)';
        btn.style.color = 'rgba(255,255,255,0.5)';
        btn.style.boxShadow = 'none';

        btn.onclick = callback;

        return btn;
    }

    toggle(key) {
        // State Logic Constraints
        // You cannot have Ignition without Fuel? (Optional constraint)
        // You cannot have Fuel without Airflow? (Optional)
        // Let's keep it free manual control for now.

        this.state[key] = !this.state[key];

        this.updateButtons();
        if (this.onStateChange) this.onStateChange(this.state);
    }

    updateButtons() {
        this.styleButton(this.airflowBtn, this.state.airflow, '#00aaff');
        this.styleButton(this.fuelBtn, this.state.fuel, '#ffaa00');
        this.styleButton(this.ignBtn, this.state.ignition, '#ff4400');
    }

    styleButton(btn, active, activeColor) {
        if (active) {
            btn.style.background = activeColor;
            btn.style.color = '#fff';
            btn.style.boxShadow = `0 0 15px ${activeColor}80`; // Glow
        } else {
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.color = 'rgba(255,255,255,0.5)';
            btn.style.boxShadow = 'none';
        }
    }
}
