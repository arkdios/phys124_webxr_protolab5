// wasd-controls, by contrast, already ships with a working `acceleration`
// schema property for movement speed, so it didn't need a replacement:
// js/ui/settings-panel.js just adjusts that property directly.

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
            this.pitch = THREE.MathUtils.degToRad(startRotation.x || 0);
            this.yaw = THREE.MathUtils.degToRad(startRotation.y || 0);
    
            this.onClick = this.onClick.bind(this);
            this.onMouseMove = this.onMouseMove.bind(this);
    
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
            this.canvas.addEventListener("click", this.onClick);
            document.addEventListener("mousemove", this.onMouseMove);
        },
    
        // Desktop mouse-look convention: click the scene to lock the pointer,
        // Escape (handled automatically by the browser) to release it.
        onClick() {
            if (document.pointerLockElement !== this.canvas) {
            this.canvas.requestPointerLock();
            }
        },
    
        onMouseMove(evt) {
            if (document.pointerLockElement !== this.canvas) return;
    
            // Base scale chosen to feel close to A-Frame's own default
            // look-controls sensitivity at sensitivity = 1.0. Not verified in
            // a live renderer; first thing to retune if looking around feels
            // too twitchy or too sluggish at the default setting.
            const BASE_SCALE = 0.002;
            const scale = BASE_SCALE * this.data.sensitivity;
    
            this.yaw -= evt.movementX * scale;
            this.pitch -= evt.movementY * scale;
    
            // Clamp pitch just short of straight up/down so the view can't
            // flip past vertical.
            const maxPitch = Math.PI / 2 - 0.01;
            this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    
            // "YXZ" order applies yaw before pitch, the standard choice for a
            // first-person camera: it keeps "up" from tilting sideways as the
            // player turns, which the default "XYZ" euler order would not.
            this.el.object3D.rotation.set(this.pitch, this.yaw, 0, "YXZ");
        },
    
        remove() {
            if (this.canvas) {
            this.canvas.removeEventListener("click", this.onClick);
            }
            document.removeEventListener("mousemove", this.onMouseMove);
        },
    });
  }