import { dbManager } from "../core/DatabaseManager.js";
import { gsap } from "gsap";

export class AuthScreen {
    constructor(container, onLoginSuccess) {
        this.container = container;
        this.onLoginSuccess = onLoginSuccess;
        this.element = null;
    }

    mount() {
        this.element = document.createElement('div');
        this.element.className = "auth-screen anim-fade-in";
        Object.assign(this.element.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(circle at center, #1e293b 0%, #090c14 100%)',
            zIndex: '1000'
        });

        // Background Grid
        const bgGrid = document.createElement('div');
        Object.assign(bgGrid.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none'
        });
        this.element.appendChild(bgGrid);

        const panel = document.createElement('div');
        panel.className = "glass-panel anim-slide-up";
        Object.assign(panel.style, {
            width: '400px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
            minHeight: '400px', transition: 'height 0.3s ease'
        });

        // Header
        const header = document.createElement('div');
        header.style.textAlign = 'center';

        const icon = document.createElement('div');
        icon.innerText = "🚀";
        icon.style.cssText = "font-size: 3rem; margin-bottom: 10px; filter: drop-shadow(0 0 10px var(--accent-primary)); animation: float 3s ease-in-out infinite;";
        header.appendChild(icon);

        const title = document.createElement('h1');
        title.innerText = "PROPULSE AI";
        title.style.cssText = "font-family: var(--font-display); color: var(--accent-primary); margin: 0; font-size: 2.2rem; letter-spacing: 3px; text-shadow: 0 0 15px var(--accent-primary);";
        header.appendChild(title);

        const sub = document.createElement('p');
        sub.innerText = "Advanced Propulsion Learning Environment";
        sub.style.cssText = "color: var(--text-muted); font-size: 0.85rem; margin-top: 5px; font-weight: 500; letter-spacing: 0.5px;";
        header.appendChild(sub);

        panel.appendChild(header);

        // State holder
        let isLogin = true;

        // Forms Container
        const formContainer = document.createElement('div');
        formContainer.style.display = 'flex';
        formContainer.style.flexDirection = 'column';
        formContainer.style.gap = '15px';
        panel.appendChild(formContainer);

        // Input Helper
        const createInput = (placeholder, type, iconChar, id) => {
            const wrap = document.createElement('div');
            wrap.style.position = 'relative';
            wrap.id = `field-${id}`; // For hiding/showing

            const i = document.createElement('div');
            i.innerText = iconChar;
            Object.assign(i.style, {
                position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)',
                direction: 'ltr',
                color: 'var(--text-muted)', fontSize: '1.2rem', pointerEvents: 'none', zIndex: '2'
            });
            wrap.appendChild(i);

            const inp = document.createElement('input');
            inp.placeholder = placeholder;
            inp.type = type;
            inp.style.paddingLeft = "45px";
            wrap.appendChild(inp);

            return { wrap, inp };
        };

        // Fields
        const fullName = createInput("Full Name", "text", "📛", "name");
        const email = createInput("Email Address", "email", "📧", "email");
        const username = createInput("Username / Callsign", "text", "👤", "username");
        const password = createInput("Password", "password", "🔑", "password");
        const confirmPass = createInput("Confirm Password", "password", "🔐", "confirm");

        // Append All (toggle visibility later)
        formContainer.appendChild(fullName.wrap);
        formContainer.appendChild(email.wrap);
        formContainer.appendChild(username.wrap);
        formContainer.appendChild(password.wrap);
        formContainer.appendChild(confirmPass.wrap);

        // Msg
        const msgBox = document.createElement('div');
        msgBox.style.cssText = "color: var(--danger); text-align: center; font-size: 0.85rem; min-height: 20px; font-weight: 600;";
        formContainer.appendChild(msgBox);

        // Buttons
        const actionBtn = document.createElement('button');
        actionBtn.className = "btn-primary";
        actionBtn.innerText = "ENTER COCKPIT";
        Object.assign(actionBtn.style, { width: '100%', marginTop: '5px' });
        formContainer.appendChild(actionBtn);

        const toggleBtn = document.createElement('p');
        toggleBtn.className = "toggle-link";
        toggleBtn.innerText = "New Cadet? Register here.";
        toggleBtn.style.cssText = "text-align: center; color: var(--text-muted); cursor: pointer; font-size: 0.85rem; transition: color 0.3s;";
        toggleBtn.onmouseover = () => toggleBtn.style.color = "var(--accent-primary)";
        toggleBtn.onmouseout = () => toggleBtn.style.color = "var(--text-muted)";
        formContainer.appendChild(toggleBtn);

        this.element.appendChild(panel);
        this.container.appendChild(this.element);

        // Logic
        const setFieldVisibility = (field, visible) => {
            if (visible) {
                field.wrap.style.display = 'block';
            } else {
                field.wrap.style.display = 'none';
            }
        };

        const updateState = () => {
            msgBox.innerText = "";
            fullName.inp.value = "";
            email.inp.value = "";
            username.inp.value = "";
            password.inp.value = "";
            confirmPass.inp.value = "";

            if (isLogin) {
                // Login Mode: Show User/Pass only
                setFieldVisibility(fullName, false);
                setFieldVisibility(email, false);
                setFieldVisibility(username, true);
                setFieldVisibility(password, true);
                setFieldVisibility(confirmPass, false);

                username.inp.placeholder = "Username or Email";
                actionBtn.innerText = "ENTER COCKPIT";
                toggleBtn.innerText = "New Cadet? Register here.";
                header.querySelector('h1').innerText = "PROPULSE AI";
            } else {
                // Register Mode: Show All
                setFieldVisibility(fullName, true);
                setFieldVisibility(email, true);
                setFieldVisibility(username, true);
                setFieldVisibility(password, true);
                setFieldVisibility(confirmPass, true);

                username.inp.placeholder = "Username";
                actionBtn.innerText = "JOIN PROGRAM";
                toggleBtn.innerText = "Already a pilot? Return to Base.";
                header.querySelector('h1').innerText = "NEW RECRUIT";
            }
        };

        // Init
        updateState();

        toggleBtn.onclick = () => {
            isLogin = !isLogin;

            // Nice flip animation
            gsap.to(formContainer, {
                opacity: 0, x: -20, duration: 0.2,
                onComplete: () => {
                    updateState();
                    gsap.fromTo(formContainer, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.2 });
                }
            });
        };

        actionBtn.onclick = () => {
            msgBox.innerText = "";

            if (isLogin) {
                const u = username.inp.value.trim();
                const p = password.inp.value.trim();

                if (!u || !p) {
                    msgBox.innerText = "Credentials required.";
                    return;
                }

                const res = dbManager.login(u, p);
                if (res.success) {
                    this.unmount();
                    this.onLoginSuccess();
                } else {
                    msgBox.innerText = res.message;
                    gsap.to(panel, { x: 10, duration: 0.05, yoyo: true, repeat: 5 });
                }
            } else {
                // Register Validation
                const name = fullName.inp.value.trim();
                const mail = email.inp.value.trim();
                const user = username.inp.value.trim();
                const pass = password.inp.value.trim();
                const conf = confirmPass.inp.value.trim();

                if (!name || !mail || !user || !pass || !conf) {
                    msgBox.innerText = "All fields are required.";
                    return;
                }

                if (!dbManager.validateEmail(mail)) {
                    msgBox.innerText = "Invalid Email Address.";
                    return;
                }

                if (pass !== conf) {
                    msgBox.innerText = "Passwords do not match.";
                    return;
                }

                if (pass.length < 4) {
                    msgBox.innerText = "Password too short.";
                    return;
                }

                const res = dbManager.register({
                    name: name,
                    email: mail,
                    username: user,
                    password: pass
                });

                if (res.success) {
                    this.unmount();
                    this.onLoginSuccess();
                } else {
                    msgBox.innerText = res.message;
                    gsap.to(panel, { x: 10, duration: 0.05, yoyo: true, repeat: 5 });
                }
            }
        };

        // Float Keyframes
        if (!document.getElementById("auth-anim")) {
            const s = document.createElement("style");
            s.id = "auth-anim";
            s.innerHTML = `@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }`;
            document.head.appendChild(s);
        }
    }

    unmount() {
        if (this.element) {
            gsap.to(this.element, {
                opacity: 0, scale: 1.1, duration: 0.5, onComplete: () => {
                    this.element.remove();
                }
            });
        }
    }
}
