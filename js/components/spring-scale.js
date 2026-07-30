// js/components/spring-scale.js
//
// The spring scale is the student's tool for this experiment: dragging
// it around the platform IS applying a force. Its offset from the
// platform centre, converted from metres to Newtons, is exactly what a
// real spring scale would read (see vector-forces.js for the
// conversion). This component builds on the generic 'grabbable'
// component for the drag mechanic itself; it only adds the "what does
// this drag mean, physically" layer on top.

import { vectorMagnitude, vectorAngleDeg } from "../physics/vector-forces.js";
import { sendRealtime } from "../network/hybrid-client.js";
import { LabState } from "../lab-state.js";

// Display scale: how many metres of drag distance represent 1 Newton.
// Chosen so Case A's expected balancing force lands well inside the
// platform's 0.35 m radius, leaving room to explore before finding it.
const METERS_PER_NEWTON = 0.1;

// This is a single client's own UI, not a multiplayer position sync,
// so it doesn't need 60 Hz, just responsive enough that a future
// chatbot's "context" feels live. ~7 Hz (every 150 ms) is already more than enough for that.
const LIVE_UPDATE_THROTTLE_MS = 150;

AFRAME.registerComponent("spring-scale", {
    schema: {
        // The platform entity this scale's offset is measured against.
        platformSelector: { type: "selector", default: "#force-platform" },
    },

    init() {
        this.lastSentAt = 0;

        this.onGrabEnd = this.onGrabEnd.bind(this);
        this.el.addEventListener("grab-end", this.onGrabEnd);
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

    // The scale's offset from the platform centre, in the platform's own
    // local space (so this works regardless of where the platform itself
    // sits in the scene), converted metres -> (Newtons, degrees).
    computeReading() {
        const platformEl = this.data.platformSelector;
        const platformPos = new THREE.Vector3();
        platformEl.object3D.getWorldPosition(platformPos);

        const myPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(myPos);

        const offsetMeters = {
        x: (myPos.x - platformPos.x) / METERS_PER_NEWTON,
        y: (myPos.y - platformPos.y) / METERS_PER_NEWTON,
        };

        return {
        forceN: Math.round(vectorMagnitude(offsetMeters) * 100) / 100,
        angleDeg: Math.round(vectorAngleDeg(offsetMeters) * 10) / 10,
        vector: offsetMeters, // raw {x, y} for force-ring.js to sum directly
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