// TODO when real controllers arrive: branch on
// this.el.sceneEl.is('vr-mode') and swap to triggerdown/triggerup +
// controller-relative offset instead of mouse events.

if (!AFRAME.components["grabbable"]) {
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
  
        // Freeze physics while held: KINEMATIC means "the physics engine
        // should never move this on its own," which is what we want while
        // the mouse is directly controlling position. No-ops harmlessly if
        // this particular entity has no body at all.
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
  
          // Push the new position into the physics body ourselves. Without
          // this, the next physics step reads the body's stale (pre-drag)
          // position and the object visually snaps back, per
          // n5ro/aframe-physics-system#78.
          const dynamicBody = this.el.components["dynamic-body"];
          if (dynamicBody) {
            dynamicBody.syncToPhysics();
          }
        }
      },
  
      onMouseUp() {
        this.isGrabbed = false;
        this.el.emit("grab-end", null, false);
  
        // Hand control back to the physics engine: gravity, friction, and
        // collision with the table now determine what happens next.
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
  }