// js/components/string-line.js
//
// Generic "connect two entities with a taut line" component. Used here
// for the force-table's strings (ring-to-pulley, ring-to-spring-scale),
// but deliberately has no force-table-specific logic in it: it just
// draws a thin cylinder from one entity's world position to another's,
// every frame. Reusable as-is for any future experiment that needs a
// string/rope/cable between two moving points (e.g. Atwood Pulley).
//
// Runs every frame rather than only on grab events because the ring
// itself moves continuously (force-ring.js repositions it based on the
// live force balance), so even the "static" pulley strings need to
// visually track the ring's small movements, not just the spring
// scale's.

if (!AFRAME.components["string-line"]) {
    AFRAME.registerComponent("string-line", {
        schema: {
            from: { type: "selector" },
            to: { type: "selector" },
            color: { type: "color", default: "#1a1a1a" },
            thickness: { type: "number", default: 0.0025 },
        },
    
        init() {
            // Unit-height cylinder along local Y; tick() scales and rotates it
            // to span whatever the current from -> to distance and direction are.
            this.el.setAttribute("geometry", {
            primitive: "cylinder",
            radius: this.data.thickness,
            height: 1,
            segmentsRadial: 6, // a string doesn't need a smooth round cross-section
            });
            this.el.setAttribute("material", { color: this.data.color, shader: "flat" });
    
            this.fromPos = new THREE.Vector3();
            this.toPos = new THREE.Vector3();
            this.midPos = new THREE.Vector3();
            this.direction = new THREE.Vector3();
            this.upAxis = new THREE.Vector3(0, 1, 0);
            this.quaternion = new THREE.Quaternion();
        },
    
        tick() {
            if (!this.data.from || !this.data.to) return;
    
            this.data.from.object3D.getWorldPosition(this.fromPos);
            this.data.to.object3D.getWorldPosition(this.toPos);
    
            // Both endpoints come in as world positions; convert into this
            // entity's own parent space so the line renders correctly
            // regardless of what it's nested under.
            const parent = this.el.object3D.parent;
            const localFrom = parent ? parent.worldToLocal(this.fromPos.clone()) : this.fromPos.clone();
            const localTo = parent ? parent.worldToLocal(this.toPos.clone()) : this.toPos.clone();
    
            this.midPos.copy(localFrom).add(localTo).multiplyScalar(0.5);
            const distance = localFrom.distanceTo(localTo);
    
            this.el.object3D.position.copy(this.midPos);
            this.el.object3D.scale.set(1, distance, 1);
    
            this.direction.copy(localTo).sub(localFrom).normalize();
            this.quaternion.setFromUnitVectors(this.upAxis, this.direction);
            this.el.object3D.quaternion.copy(this.quaternion);
        },
    });
  }