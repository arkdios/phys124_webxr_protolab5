// Desktop stand-in for controller "grab" interaction (no Quest headset
// yet). Uses A-Frame's built-in desktop mouse mode instead:
// <a-scene cursor="rayOrigin: mouse" raycaster="objects: .interactive">
// already turns the mouse position into a ray and fires mousedown/mouseup
// on intersected entities, so no extra plumbing is needed for the click part.
//
// On grab, this builds a plane facing the camera through the object's
// current position, then drags the object along that plane as the mouse
// moves (the standard three.js "drag on a plane" technique). For this
// experiment specifically, the force platform faces the camera directly
// (see index.html), so this camera-facing plane happens to line up
// almost exactly with the platform's own 2D surface. That's convenient
// on purpose: it's why the platform was modelled as a wall-mounted disk
// facing the student rather than a horizontal tabletop (see BUILD-LOG.md
// decision log).
//
// TODO when real controllers arrive: branch on
// this.el.sceneEl.is('vr-mode') and swap to triggerdown/triggerup +
// controller-relative offset instead of mouse events.

AFRAME.registerComponent("grabbable", {
    init() {
        this.isGrabbed = false;
        this.dragPlane = new THREE.Plane();
        this.intersectionPoint = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster();
    
        // Bind once so add/removeEventListener reference the same function.
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
    
        this.el.addEventListener("mousedown", this.onMouseDown);
    },
  
    onMouseDown() {
        this.isGrabbed = true;
        this.el.emit("grab-start", null, false);
    
        const camera = this.el.sceneEl.camera;
        const camWorldDir = new THREE.Vector3();
        camera.getWorldDirection(camWorldDir);
    
        const objWorldPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(objWorldPos);
    
        this.dragPlane.setFromNormalAndCoplanarPoint(camWorldDir, objWorldPos);
    
        // No-ops unless a physics system is loaded (see file header).
        const CANNON = AFRAME.CANNON;
        if (this.el.body && CANNON) {
            this.el.body.type = CANNON.Body.KINEMATIC;
        }
    
        document.addEventListener("mousemove", this.onMouseMove);
        document.addEventListener("mouseup", this.onMouseUp);
    },
  
    onMouseMove(evt) {
        if (!this.isGrabbed) return;
    
        const camera = this.el.sceneEl.camera;
        const mouseNDC = new THREE.Vector2(
            (evt.clientX / window.innerWidth) * 2 - 1,
            -(evt.clientY / window.innerHeight) * 2 + 1
        );
    
        this.raycaster.setFromCamera(mouseNDC, camera);
        const hit = this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectionPoint);
    
        if (hit) {
            this.el.object3D.position.copy(this.el.object3D.parent.worldToLocal(this.intersectionPoint.clone()));
            if (this.el.body) {
            this.el.body.position.copy(this.intersectionPoint);
            }
        }
    },
  
    onMouseUp() {
        this.isGrabbed = false;
        this.el.emit("grab-end", null, false);
    
        const CANNON = AFRAME.CANNON;
        if (this.el.body && CANNON) {
            this.el.body.type = CANNON.Body.DYNAMIC;
            this.el.body.wakeUp?.();
        }
    
        document.removeEventListener("mousemove", this.onMouseMove);
        document.removeEventListener("mouseup", this.onMouseUp);
    },
  
    remove() {
        this.el.removeEventListener("mousedown", this.onMouseDown);
        document.removeEventListener("mousemove", this.onMouseMove);
        document.removeEventListener("mouseup", this.onMouseUp);
    },
});