// js/main.js
//
// Entry point. Importing the component files registers them with AFRAME
// as a side effect (AFRAME.registerComponent runs at module load time).
// Then this wires LabState + the live reading events to the on-screen
// panel, and kicks off the hybrid backend connection.

import "./components/grabbable.js";
import "./components/spring-scale.js";
import "./components/force-ring.js";
import { LabState } from "./lab-state.js";
import { init as initBackend, onConnectionChange } from "./network/hybrid-client.js";

// No live backend yet. This lag short-circuits every network call
// in rest-client.js and socket-client.js so the console stays clean.
// Flip to false once there's a real backend to test against.
window.__LAB_BACKEND_DISABLED__ = true;

const panel = {
    step: document.querySelector("#hud-step-value"),
    force: document.querySelector("#hud-force-value"),
    angle: document.querySelector("#hud-angle-value"),
    connection: document.querySelector("#hud-connection-value"),
};

// Discrete state (idle / balance-attempt / balanced); see lab-state.js
LabState.subscribe((state) => {
    panel.step.textContent = state.step;
});

// Continuous reading (force/angle while dragging).
// This listens directly on the scene rather than going through LabState,
// since it's a per-frame UI update with no need to touch the network
// layer or the durable event log (spring-scale.js already handles the
// throttled network side separately).
document.querySelector("a-scene").addEventListener("reading-update", (evt) => {
    panel.force.textContent = `${evt.detail.forceN} N`;
    panel.angle.textContent = `${evt.detail.angleDeg}°`;
});

onConnectionChange((connected) => {
    panel.connection.textContent = connected ? "Connected" : "Offline";
    panel.connection.dataset.status = connected ? "online" : "offline";
});

initBackend({ course: "PHYS 124", experiment: "vector-addition-of-forces" });

console.log("[main] PHYS 124: Vector Addition of Forces scene ready.");