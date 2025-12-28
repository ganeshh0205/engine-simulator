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

import { SceneManager } from "./core/SceneManager.js";
// import { TutorialManager } from "./core/TutorialManager.js"; // Disabled

const app = document.getElementById("app");

// DIRECT LAUNCH
const sceneManager = new SceneManager(app);

// Initialize Tutorial Module
// const tutorial = new TutorialManager(sceneManager);
// sceneManager.tutorial = tutorial; // Attach to scene logic

sceneManager.start();


// Ensure controls are visible
if (sceneManager.interactionManager && sceneManager.interactionManager.controlPanel) {
}
