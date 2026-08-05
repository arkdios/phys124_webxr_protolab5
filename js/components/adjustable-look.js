// Click-and-drag to look around, matching A-Frame's own default
// look-controls behaviour on desktop (hold the mouse button, drag to
// rotate the view; release to stop).
//
// Deliberately desktop-mouse-only, no VR/HMD or touch handling: this
// project has no Quest headset to test against yet,
// and a headset's own head-tracking doesn't need a "sensitivity" setting
// at all -- a mouse-sensitivity component has nothing to do there.
// Revisit this file once real headset testing starts; look-controls (or
// a proper VR-aware fork of this component) is the right choice again
// at that point.

if (!AFRAME.components["adjustable-look"]) {
    AFRAME.registerComponent("adjustable-look", {
        schema: {
            sensitivity: { type: "number", default: 1.0 },
        },
    
        init() {
            // Start from whatever rotation was already set in the HTML (the
            // default "looking down at the table" framing), converted to
            // radians for the running pitch/yaw accumulators below.
            const startRotation = this.el.getAttribute("rotation") || { x: 0, y: 0 };
            this.pitch = ((startRotation.x || 0) * Math.PI) / 180;
            this.yaw = ((startRotation.y || 0) * Math.PI) / 180;
    
            this.isDragging = false;
            this.lastX = 0;
            this.lastY = 0;
    
            this.onMouseDown = this.onMouseDown.bind(this);
            this.onMouseMove = this.onMouseMove.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);
    
            // The canvas exists once the scene has rendered at least once; on
            // a fresh page load that may not have happened yet at init() time.
            const sceneEl = this.el.sceneEl;
            if (sceneEl.canvas) {
            this.attach();
            } else {
            sceneEl.addEventListener("render-target-loaded", () => this.attach());
            }
        },
    
        attach() {
            this.canvas = this.el.sceneEl.canvas;
            this.canvas.addEventListener("mousedown", this.onMouseDown);
            document.addEventListener("mousemove", this.onMouseMove);
            document.addEventListener("mouseup", this.onMouseUp);
        },
    
        onMouseDown(evt) {
            this.isDragging = true;
            this.lastX = evt.clientX;
            this.lastY = evt.clientY;
        },
    
        onMouseMove(evt) {
            if (!this.isDragging) return;
    
            const dx = evt.clientX - this.lastX;
            const dy = evt.clientY - this.lastY;
            this.lastX = evt.clientX;
            this.lastY = evt.clientY;
    
            // Base scale chosen to feel close to A-Frame's own default
            // look-controls sensitivity at sensitivity = 1.0. Not verified in
            // a live renderer; first thing to retune if looking around feels
            // too twitchy or too sluggish at the default setting.
            const BASE_SCALE = 0.0025;
            const scale = BASE_SCALE * this.data.sensitivity;
    
            this.yaw -= dx * scale;
            this.pitch -= dy * scale;
    
            // Clamp pitch just short of straight up/down so the view can't
            // flip past vertical.
            const maxPitch = Math.PI / 2 - 0.01;
            this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    
            // "YXZ" order applies yaw before pitch, the standard choice for a
            // first-person camera: it keeps "up" from tilting sideways as the
            // player turns, which the default "XYZ" euler order would not.
            this.el.object3D.rotation.set(this.pitch, this.yaw, 0, "YXZ");
        },
    
        onMouseUp() {
            this.isDragging = false;
        },
    
        remove() {
            if (this.canvas) {
            this.canvas.removeEventListener("mousedown", this.onMouseDown);
            }
            document.removeEventListener("mousemove", this.onMouseMove);
            document.removeEventListener("mouseup", this.onMouseUp);
        },
    });
}