// VISUAL ERROR LOGGER
window.onerror = function (message, source, lineno, colno, error) {
  const errorBox = document.createElement("div");
  errorBox.style.position = "fixed";
  errorBox.style.top = "0";
  errorBox.style.left = "0";
  errorBox.style.width = "100%";
  errorBox.style.backgroundColor = "rgba(255, 0, 0, 0.9)";
  errorBox.style.color = "white";
  errorBox.style.padding = "20px";
  errorBox.style.fontFamily = "monospace";
  errorBox.style.zIndex = "9999";
  errorBox.innerHTML = `<h3>Error Detected</h3>
  <p><strong>Message:</strong> ${message}</p>
  <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
  <pre>${error ? error.stack : "No stack trace"}</pre>`;
  document.body.appendChild(errorBox);
};

import './style.css';
import { SceneManager } from "./core/SceneManager.js";
import { HomeScreen } from "./ui/HomeScreen.js";
import { AuthScreen } from "./ui/AuthScreen.js";
import { dbManager } from "./core/DatabaseManager.js";

const app = document.getElementById("app");

// ROUTING / STATE MANAGEMENT
// ROUTING / STATE MANAGEMENT
const startSimulation = () => {
  // Initialize SceneManager (Engine Sim)
  // We pass an onExit callback to SceneManager
  const sceneManager = new SceneManager(app, () => {
    // On Exit: Cleanup is handled by SceneManager.dispose() usually
    // but here we just re-launch Home.
    app.innerHTML = "";
    launchHomeScreen();
  });
  sceneManager.start();
};

import { MentorView } from "./ui/MentorView.js";

const initApp = () => {
  // Check if user is logged in
  if (!dbManager.isLoggedIn()) {
    const auth = new AuthScreen(app, () => {
      // On Success
      launchHomeScreen();
    });
    auth.mount();
  } else {
    launchHomeScreen();
  }
};

const launchHomeScreen = () => {
  // Clear App (Auth might have left stuff)
  app.innerHTML = "";

  new HomeScreen((mode) => {
    if (mode === "SIMULATE") {
      startSimulation();
    } else if (mode === "MENTOR") {
      new MentorView((targetMode) => {
        if (targetMode === "SIMULATE") startSimulation();
        else if (targetMode === "HOME") launchHomeScreen();
      });
    } else {
      console.log("Unknown mode:", mode);
      launchHomeScreen();
    }
  });
};

initApp();
