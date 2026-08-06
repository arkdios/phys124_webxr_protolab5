// TODO when real controllers arrive: branch on
// this.el.sceneEl.is('vr-mode') and swap to triggerdown/triggerup +
// controller-relative offset instead of mouse events.

// Defensive guard: if this module's top-level code somehow runs twice in
// the same page session (stale cached bundle colliding with a fresh one,
// a duplicate script include, etc.), AFRAME.registerComponent throws and
// takes the whole scene down with it. Registering only once, and skipping
// silently on a re-run, makes that failure mode a no-op instead of a crash.

import { setDraggingObject } from "../interaction-state.js";

if (!AFRAME.components["grabbable"]) {
    AFRAME.registerComponent("grabbable", {
        init() {
            this.isGrabbed = false;
            this.dragPlane = new THREE.Plane();
            this.intersectionPoint = new THREE.Vector3();
            this.raycaster = new THREE.Raycaster();
            this.mouseNDC = new THREE.Vector2();

            // Bind once so add/removeEventListener reference the same function.
            this.onMouseDown = this.onMouseDown.bind(this);
            this.onMouseMove = this.onMouseMove.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);

            this.el.addEventListener("mousedown", this.onMouseDown);
        },

        onMouseDown() {
            console.log("[grabbable] mousedown on", this.el.id || this.el.tagName);

            this.isGrabbed = true;
            setDraggingObject(true); // tells adjustable-look to ignore this drag
            this.el.emit("grab-start", null, false);

            const camera = this.el.sceneEl.camera;
            const camWorldDir = new THREE.Vector3();
            camera.getWorldDirection(camWorldDir);

            const objWorldPos = new THREE.Vector3();
            this.el.object3D.getWorldPosition(objWorldPos);

            this.dragPlane.setFromNormalAndCoplanarPoint(camWorldDir, objWorldPos);

            // Freeze physics while held: KINEMATIC means "the physics engine
            // should never move this on its own," which is what we want while
            // the mouse is directly controlling position. No-ops harmlessly if
            // this particular entity has no body at all.
            //
            // AFRAME.CANNON isn't exposed by this physics driver -- checked
            // against its source, which keeps its cannon-es import
            // module-local and never attaches it to the AFRAME namespace --
            // so this reads KINEMATIC/DYNAMIC off the body's own constructor
            // instead of a global that doesn't exist here.
            if (this.el.body) {
                this.el.body.type = this.el.body.constructor.KINEMATIC;
                // cannon-es still integrates position from velocity for
                // KINEMATIC bodies (only gravity/damping skip them, not
                // integration) -- checked directly in its integrate() source.
                // Without this, whatever velocity the body had the instant
                // it was grabbed keeps silently accumulating into its
                // position every physics step, drifting it away from the
                // cursor on its own. That's the stretch-then-vanish you saw.
                this.el.body.velocity.set(0, 0, 0);
                this.el.body.angularVelocity.set(0, 0, 0);
            }

            document.addEventListener("mousemove", this.onMouseMove);
            document.addEventListener("mouseup", this.onMouseUp);
        },

        onMouseMove(evt) {
            if (!this.isGrabbed) return;

            const camera = this.el.sceneEl.camera;
            this.mouseNDC.set(
                (evt.clientX / window.innerWidth) * 2 - 1,
                -(evt.clientY / window.innerHeight) * 2 + 1
            );

            this.raycaster.setFromCamera(this.mouseNDC, camera);
            const hit = this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectionPoint);

            if (hit) {
                this.el.object3D.position.copy(this.el.object3D.parent.worldToLocal(this.intersectionPoint.clone()));

                // Push the new position into the physics body ourselves. Without
                // this, the next physics step reads the body's stale (pre-drag)
                // position and the object visually snaps back
                const dynamicBody = this.el.components["dynamic-body"];
                if (dynamicBody) {
                    try {
                        dynamicBody.syncToPhysics();
                    } catch (err) {
                        console.warn("[grabbable] syncToPhysics() failed on", this.el.id, ":", err.message);
                    }
                }
            }
        },

        onMouseUp() {
            this.isGrabbed = false;
            setDraggingObject(false);
            this.el.emit("grab-end", null, false);

            // Hand control back to the physics engine: gravity, friction, and
            // collision with the table now determine what happens next.
            if (this.el.body) {
                this.el.body.type = this.el.body.constructor.DYNAMIC;
                this.el.body.velocity.set(0, 0, 0);
                this.el.body.angularVelocity.set(0, 0, 0);
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
}