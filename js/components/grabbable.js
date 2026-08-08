// TODO when real controllers arrive: branch on
// this.el.sceneEl.is('vr-mode') and swap to triggerdown/triggerup +
// controller-relative offset instead of mouse events.

// Defensive guard: if this module's top-level code somehow runs twice in
// the same page session (stale cached bundle colliding with a fresh one,
// a duplicate script include, etc.), AFRAME.registerComponent throws and
// takes the whole scene down with it. Registering only once, and skipping
// silently on a re-run, makes that failure mode a no-op instead of a crash.

import { setDraggingObject } from "../interaction-state.js";

if (!AFRAME.components["mouse-grabbable"]) {
    AFRAME.registerComponent("mouse-grabbable", {
        init() {
            // TEMP DIAGNOSTIC — remove once dragging is confirmed working.
            console.log("[grabbable/debug] init() called on", this.el.id || this.el.tagName);
        
            this.isGrabbed = false;
            this.dragPlane = new THREE.Plane();
            this.intersectionPoint = new THREE.Vector3();
            this.raycaster = new THREE.Raycaster();
            this.mouseNDC = new THREE.Vector2();
        
            this.onMouseDown = this.onMouseDown.bind(this);
            this.onMouseMove = this.onMouseMove.bind(this);
            this.onMouseUp = this.onMouseUp.bind(this);
            this.onHoverMove = this.onHoverMove.bind(this);
        
            this.canvas = this.el.sceneEl.canvas;
            if (this.canvas) {
                console.log("[grabbable/debug] canvas found synchronously, attaching listener for", this.el.id);
                this.canvas.addEventListener("mousedown", this.onMouseDown);
                this.canvas.addEventListener("mousemove", this.onHoverMove);
            } else {
                console.log("[grabbable/debug] canvas not ready yet, waiting on render-target-loaded for", this.el.id);
                this.el.sceneEl.addEventListener("render-target-loaded", () => {
                    this.canvas = this.el.sceneEl.canvas;
                    console.log("[grabbable/debug] render-target-loaded fired, attaching listener for", this.el.id);
                    this.canvas.addEventListener("mousedown", this.onMouseDown);
                    this.canvas.addEventListener("mousemove", this.onHoverMove);
                });
            }
        },

        // Cursor feedback while just moving the mouse (not dragging).
        // Assumes a single grabbable entity on the page — with two or more,
        // each instance would fight over canvas.style.cursor and this needs
        // a shared "who currently owns the cursor" check instead.
        onHoverMove(evt) {
            if (this.isGrabbed) return; // onMouseDown already set "grabbing"

            const camera = this.el.sceneEl.camera;
            this.mouseNDC.set(
                (evt.clientX / window.innerWidth) * 2 - 1,
                -(evt.clientY / window.innerHeight) * 2 + 1
            );
            this.raycaster.setFromCamera(this.mouseNDC, camera);
            const hits = this.raycaster.intersectObject(this.el.object3D, true);
            this.canvas.style.cursor = hits.length ? "grab" : "default";
        },

        onMouseDown(evt) {
            const camera = this.el.sceneEl.camera;
            this.mouseNDC.set(
                (evt.clientX / window.innerWidth) * 2 - 1,
                -(evt.clientY / window.innerHeight) * 2 + 1
            );
            this.raycaster.setFromCamera(this.mouseNDC, camera);
            const hits = this.raycaster.intersectObject(this.el.object3D, true);
        
            // TEMP DIAGNOSTIC — remove once dragging is confirmed working.
            console.log(
                "[grabbable/debug]", this.el.id || this.el.tagName,
                "client:", evt.clientX, evt.clientY,
                "ndc:", this.mouseNDC.x.toFixed(3), this.mouseNDC.y.toFixed(3),
                "hits:", hits.length,
                hits.length ? hits[0].object.name || hits[0].object.type : "(none)"
            );
        
            if (hits.length === 0) return;
        
            console.log("[grabbable] mousedown on", this.el.id || this.el.tagName);

            this.isGrabbed = true;
            this.canvas.style.cursor = "grabbing";
            setDraggingObject(true); // tells adjustable-look to ignore this drag
            this.el.emit("grab-start", null, false);

            const objWorldPos = new THREE.Vector3();
            this.el.object3D.getWorldPosition(objWorldPos);

            // Horizontal plane at the object's current height, not a
            // camera-facing plane.
            this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), objWorldPos);

            // Freeze physics while held: KINEMATIC means "the physics engine
            // should never move this on its own," which is what we want while
            // the mouse is directly controlling position. No-ops harmlessly if
            // this particular entity has no body at all.
            if (this.el.body) {
                this.el.body.type = this.el.body.constructor.KINEMATIC;
                // cannon-es still integrates position from velocity for
                // KINEMATIC bodies (only gravity/damping skip them, not
                // integration)
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
            if (this.canvas) {
                this.canvas.removeEventListener("mousedown", this.onMouseDown);
                this.canvas.removeEventListener("mousemove", this.onHoverMove);
                this.canvas.style.cursor = "default";
            }
            document.removeEventListener("mousemove", this.onMouseMove);
            document.removeEventListener("mouseup", this.onMouseUp);
        },
    });
}