import "./components/adjustable-look.js";
import "./components/grabbable.js";
import "./components/spring-scale.js";
import "./components/force-ring.js";
import "./components/string-line.js";
import { LabState } from "./lab-state.js";
import { init as initBackend, onConnectionChange } from "./network/hybrid-client.js";
import { initSceneHud } from "./ui/scene-hud.js";
import { initSettingsPanel } from "./ui/settings-panel.js";

// No live backend yet (open item #4 is now resolved as hybrid WebSocket
// + REST. This flag short-circuits every network call in rest-client.js and
// socket-client.js so the console stays clean. Flip to false once there's a
// real backend to test against.
window.__LAB_BACKEND_DISABLED__ = true;

const panel = {
    step: document.querySelector("#hud-step-value"),
    force: document.querySelector("#hud-force-value"),
    angle: document.querySelector("#hud-angle-value"),
    connection: document.querySelector("#hud-connection-value"),
};

const sceneHud = initSceneHud();
initSettingsPanel();

// Merged local copy of the same two data sources the flat panel reads
// (LabState's step, and spring-scale.js's reading-update event), so the
// diegetic panel's single multi-line text block can show all three
// values together no matter which one just changed.
const sceneReadout = { step: "idle", forceN: 0, angleDeg: 0 };

// Discrete state (idle / balance-attempt / balanced); see lab-state.js
LabState.subscribe((state) => {
    panel.step.textContent = state.step;
    sceneReadout.step = state.step;
    sceneHud.setReadout(sceneReadout);
});

// Continuous reading (force/angle while dragging).
// This listens directly on the scene rather than going through LabState,
// since it's a per-frame UI update with no need to touch the network
// layer or the durable event log (spring-scale.js already handles the
// throttled network side separately).
document.querySelector("a-scene").addEventListener("reading-update", (evt) => {
    panel.force.textContent = `${evt.detail.forceN} N`;
    panel.angle.textContent = `${evt.detail.angleDeg}°`;
    sceneReadout.forceN = evt.detail.forceN;
    sceneReadout.angleDeg = evt.detail.angleDeg;
    sceneHud.setReadout(sceneReadout);
});

onConnectionChange((connected) => {
    panel.connection.textContent = connected ? "Connected" : "Offline";
    panel.connection.dataset.status = connected ? "online" : "offline";
    sceneHud.setConnection(connected);
});

initBackend({ course: "PHYS 124", experiment: "vector-addition-of-forces" });

console.log("[main] PHYS 124: Vector Addition of Forces scene ready.");