// Desktop-only on purpose: these are plain HTML <input type="range">
// elements in #lab-console, which (like the rest of that panel) doesn't
// render inside a WebXR-presented session. A VR-native version of this
// would need real 3D sliders and controller input, which don't exist in
// this project yet (no headset to test against).

export function initSettingsPanel() {
    const rig = document.querySelector("#rig");
    const moveSpeedInput = document.querySelector("#setting-move-speed");
    const lookSpeedInput = document.querySelector("#setting-look-speed");
  
    moveSpeedInput.addEventListener("input", (evt) => {
      rig.setAttribute("wasd-controls", "acceleration", Number(evt.target.value));
    });
  
    lookSpeedInput.addEventListener("input", (evt) => {
      rig.setAttribute("adjustable-look", "sensitivity", Number(evt.target.value));
    });
  }