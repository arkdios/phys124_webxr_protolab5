// Deliberately NOT camera-attached: a panel that follows your gaze
// reads as "text glued to your face," a common VR comfort complaint.
// This is a fixed object in the world, the same way a real lab's
// wall-mounted instructions would be; the desktop-mode WASD/look
// controls already let a student turn toward it like anything else on
// the table.

export function initSceneHud() {
    const connectionText = document.querySelector("#hud3d-connection");
    const readoutText = document.querySelector("#hud3d-readout");
  
    function setConnection(connected) {
        connectionText.setAttribute("value", connected ? "Status: Connected" : "Status: Offline");
        connectionText.setAttribute("color", connected ? "#346538" : "#9F2F2D");
    }
  
    function setReadout({ step, forceN, angleDeg }) {
        readoutText.setAttribute("value", `Step: ${step}\nForce: ${forceN} N\nAngle: ${angleDeg} deg`);
    }
  
    return { setConnection, setReadout };
}