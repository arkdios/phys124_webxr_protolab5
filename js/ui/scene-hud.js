// Camera-attached by design: a persistent Force/Angle readout that stays
// in view while the student is focused on the ring is more useful here
// than a wall panel they'd have to turn away from mid-drag. Worth
// revisiting once real headset testing starts -- head-locked UI is a
// common VR comfort complaint, and the flat #lab-console panel already
// covers this same information for anyone who'd rather not have it in
// their view.

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