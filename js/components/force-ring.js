// The ring is the experiment's "readout": its position visually
// represents how far the system is from equilibrium. This is a
// simplified PROPORTIONAL visualization, not a full spring/damper
// physics simulation. A real spring-mass model would be more
// physically accurate, but would be an overkill to teach the concept
// being tested here (does the vector sum reach zero).

import { polarToCartesian, sumVectors, vectorMagnitude, massToForce } from "../physics/vector-forces.js";
import { GRAVITY_M_S2, EXPERIMENT_CASES, ACTIVE_CASE_KEY } from "../data/experiment-cases.js";
import { LabState } from "../lab-state.js";

const DISPLAY_GAIN = 0.02; // metres of ring offset shown per Newton of imbalance
const MAX_RING_OFFSET_M = 0.08; // clamp so a very unbalanced drag doesn't fling the ring off-screen
const BALANCE_TOLERANCE_N = 0.1; // "close enough" to count as balanced; real spring scales aren't perfect either

AFRAME.registerComponent("force-ring", {
    init() {
        this.wasBalanced = false;
        this.latestScaleVector = { x: 0, y: 0 };

        // The two known (fixed) hanging-mass forces for the active case,
        // converted from (mass, angle) to (x, y) once at init. These don't
        // change while the scene runs; only the spring scale's vector does.
        const activeCase = EXPERIMENT_CASES[ACTIVE_CASE_KEY];
        this.knownVectors = activeCase.knownForces.map(({ massKg, angleDeg }) =>
        polarToCartesian(massToForce(massKg, GRAVITY_M_S2), angleDeg)
        );

        this.onReadingUpdate = this.onReadingUpdate.bind(this);
        this.el.sceneEl.addEventListener("reading-update", this.onReadingUpdate);
    },

    onReadingUpdate(evt) {
        this.latestScaleVector = evt.detail.vector;
    },

    tick() {
        const netForce = sumVectors([...this.knownVectors, this.latestScaleVector]);
        const imbalance = vectorMagnitude(netForce);

        const offsetMagnitude = Math.min(imbalance * DISPLAY_GAIN, MAX_RING_OFFSET_M);
        const angle = Math.atan2(netForce.y, netForce.x);

        this.el.object3D.position.x = Math.cos(angle) * offsetMagnitude;
        this.el.object3D.position.y = Math.sin(angle) * offsetMagnitude;

        const isBalanced = imbalance < BALANCE_TOLERANCE_N;
        // Only fire the LabState transition on the *edge* (unbalanced -> balanced),
        // not every frame the ring happens to sit near centre. Otherwise this
        // would spam the durable event log every ~16ms while balanced.
        if (isBalanced && !this.wasBalanced) {
        LabState.setActive("scale", "balanced", { netForceN: Math.round(imbalance * 100) / 100 });
        }
        this.wasBalanced = isBalanced;
    },

    remove() {
        this.el.sceneEl.removeEventListener("reading-update", this.onReadingUpdate);
    },
});