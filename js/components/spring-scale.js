// Runs its force computation every frame via A-Frame's tick() lifecycle
// method rather than reacting to grabbable's mousemove. That decouples
// this component entirely from grabbable's internals (it doesn't care
// how the entity moved, only where it currently is), and means the
// reading updates smoothly even if grabbable's drag logic changes later.

import { vectorMagnitude, vectorAngleDeg } from "../physics/vector-forces.js";
import { sendRealtime } from "../network/hybrid-client.js";
import { LabState } from "../lab-state.js";

// Display scale: how many metres of drag distance represent 1 Newton.
// Chosen so Case A's expected balancing force lands well inside the
// platform's 0.35 m radius, leaving room to explore before finding it.
const METERS_PER_NEWTON = 0.1;

// The real VWR spring scale in the course's Experiment 5 slide deck is
// rated 0-6 N. Capping the reading here (rather than letting an
// extreme drag report an arbitrarily large force) both matches the real
// tool's limits and keeps the physics-driven ring (force-ring.js) from
// being handed an unrealistic force to integrate.
const MAX_SCALE_FORCE_N = 6;

const LIVE_UPDATE_THROTTLE_MS = 150; // approx 7 Hz

// Defensive guard against duplicate registration; see grabbable.js's
// file header for why this matters.
if (!AFRAME.components["spring-scale"]) {
    AFRAME.registerComponent("spring-scale", {
        schema: {
        // The platform entity this scale's offset is measured against.
        platformSelector: { type: "selector", default: "#force-platform" },
        },

        init() {
        this.lastSentAt = 0;

        this.onGrabEnd = this.onGrabEnd.bind(this);
        this.el.addEventListener("grab-end", this.onGrabEnd);

        this.addCosmeticDetails();
        },

        addCosmeticDetails() {
        const stripeGeometry = new THREE.BoxGeometry(0.028, 0.026, 0.017);
        const stripeMaterial = new THREE.MeshStandardMaterial({ color: "#2C5F8A" });
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.set(0.015, 0, 0.001);
        this.el.object3D.add(stripe);

        const hookGeometry = new THREE.CylinderGeometry(0.006, 0.006, 0.014, 8);
        const hookMaterial = new THREE.MeshStandardMaterial({ color: "#9a9a9a" });

        const hookRight = new THREE.Mesh(hookGeometry, hookMaterial);
        hookRight.rotation.z = Math.PI / 2;
        hookRight.position.set(0.05, 0, 0);
        this.el.object3D.add(hookRight);

        const hookLeft = new THREE.Mesh(hookGeometry, hookMaterial);
        hookLeft.rotation.z = Math.PI / 2;
        hookLeft.position.set(-0.05, 0, 0);
        this.el.object3D.add(hookLeft);
        },

        tick() {
        const reading = this.computeReading();

        // Local UI update: free, happens every frame, no network involved.
        this.el.sceneEl.emit("reading-update", reading, false);

        // Network update: throttled (see LIVE_UPDATE_THROTTLE_MS above).
        const now = performance.now();
        if (now - this.lastSentAt > LIVE_UPDATE_THROTTLE_MS) {
            this.lastSentAt = now;
            sendRealtime({ type: "spring-scale-reading", ...reading });
        }
        },

        // The scale's offset from the platform centre, in the table's
        // horizontal plane (world X/Z, since the table is flat with world Y
        // reserved for height/gravity.
        computeReading() {
        const platformEl = this.data.platformSelector;
        const platformPos = new THREE.Vector3();
        platformEl.object3D.getWorldPosition(platformPos);

        const myPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(myPos);

        // world_z = table.z - radius * sin(angle) is the mapping used for
        // every object's position in index.html; this is that mapping's
        // inverse, recovering the abstract (x, y) vector from a world
        // (X, Z) offset.
        const rawOffsetMeters = {
            x: (myPos.x - platformPos.x) / METERS_PER_NEWTON,
            y: -(myPos.z - platformPos.z) / METERS_PER_NEWTON,
        };

        const rawMagnitude = vectorMagnitude(rawOffsetMeters);
        const clampedMagnitude = Math.min(rawMagnitude, MAX_SCALE_FORCE_N);
        const scaleFactor = rawMagnitude > 0 ? clampedMagnitude / rawMagnitude : 0;
        const offsetMeters = {
            x: rawOffsetMeters.x * scaleFactor,
            y: rawOffsetMeters.y * scaleFactor,
        };

        return {
            forceN: Math.round(clampedMagnitude * 100) / 100,
            angleDeg: Math.round(vectorAngleDeg(rawOffsetMeters) * 10) / 10, // angle unaffected by the magnitude clamp
            vector: offsetMeters, // clamped {x, y} for force-ring.js to sum directly
        };
        },

        // Grab-end is the moment that matters for the chatbot's grounding
        // context (e.g. "the student tried balancing at F=2.8N, 253°"), so this
        // is the one point where a spring-scale reading goes through
        // LabState's durable REST log instead of just the throttled live feed.
        onGrabEnd() {
        LabState.setActive(this.el.id, "balance-attempt", this.computeReading());
        },

        remove() {
        this.el.removeEventListener("grab-end", this.onGrabEnd);
        },
  });
}