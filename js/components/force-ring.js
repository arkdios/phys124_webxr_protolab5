// The table is horizontal, so "the platform's 2D plane" is
// now world X/Z, with world Y reserved for gravity/height. The vector
// math throughout this codebase (polarToCartesian, sumVectors etc.)
// still works in an abstract (x, y) pair; this file maps that pair's
// y-component onto world -Z (matching the same mapping used for every
// object's initial position in index.html: world_z = table.z -
// radius * sin(angle)). Force x maps straight onto world X.

import { polarToCartesian, sumVectors, massToForce } from "../physics/vector-forces.js";
import { GRAVITY_M_S2, EXPERIMENT_CASES, ACTIVE_CASE_KEY } from "../data/experiment-cases.js";
import { LabState } from "../lab-state.js";

const BALANCE_TOLERANCE_M = 0.01; // ring within 1cm of centre (in the table plane) counts as balanced

// World X/Z the ring/anchor rest above; matches #force-platform's centre
// (0 0.9 -0.6). force-platform never moves, so this is safe to hardcode;
// if that ever changes, update this alongside it and index.html.
const PLATFORM_CENTER_WORLD_XZ = { x: 0, z: -0.6 };

if (!AFRAME.components["force-ring"]) {
    AFRAME.registerComponent("force-ring", {
        init() {
        this.wasBalanced = false;
        this.latestScaleVector = { x: 0, y: 0 };
    
        // #platform-anchor needs a real body for the 'spring' component to
        // attach to, but its collision shape would otherwise physically
        // shove the ring away right as it approaches centre -- exactly
        // where the balance check needs it to be able to go. Disabling
        // collisionResponse keeps the body (and the spring constraint)
        // without the contact push.
        const anchorEl = document.querySelector("#platform-anchor");
        anchorEl.addEventListener("body-loaded", () => {
            anchorEl.body.collisionResponse = false;
            // collisionResponse only disables the push-apart (normal) force.
            anchorEl.body.material = new CANNON.Material({ friction: 0, restitution: 0 });
        });

        // The two known (fixed) hanging-mass forces for the active case,
        // converted from (mass, angle) to (x, y) once at init. These don't
        // change while the scene runs; only the spring scale's vector does.
        const activeCase = EXPERIMENT_CASES[ACTIVE_CASE_KEY];
        this.knownVectors = activeCase.knownForces.map(({ massKg, angleDeg }) =>
            polarToCartesian(massToForce(massKg, GRAVITY_M_S2), angleDeg)
        );

        this.onReadingUpdate = this.onReadingUpdate.bind(this);
        this.el.sceneEl.addEventListener("reading-update", this.onReadingUpdate);

        // Free rotation on this body would just be visual noise (a ring
        // tumbling instead of sliding), and would also let the spring's
        // torque fight itself. fixedRotation also means the exact
        // point-of-application for the forces below doesn't matter.
        this.el.addEventListener("body-loaded", () => {
            const body = this.el.body;
            body.fixedRotation = true;
            body.updateMassProperties();
            body.collisionResponse = false;
            body.material = new CANNON.Material({ friction: 0, restitution: 0 });
        });
        },

        onReadingUpdate(evt) {
        this.latestScaleVector = evt.detail.vector;
        },

        tick() {
            const body = this.el.body;
            if (!body) return; // physics body not ready yet (still loading)
    
            // Defensive recovery: this ring is very light (0.01kg) with a stiff
            // (k=40) spring pulling it to centre.
            const finite = Number.isFinite(body.position.x) && Number.isFinite(body.position.y) &&
                Number.isFinite(body.position.z) && Number.isFinite(body.velocity.x) &&
                Number.isFinite(body.velocity.y) && Number.isFinite(body.velocity.z);
            if (!finite) {
                console.warn("[force-ring] physics state went non-finite, resetting to spawn position");
                body.position.set(0, 0.94, -0.6);
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
                body.force.set(0, 0, 0);
                body.torque.set(0, 0, 0);
            }

        // The spring component (index.html) already applies the
        // centre-seeking restoring force every tick on its own, in all 3
        // axes, but since the anchor sits at the ring's own resting
        // height, its vertical pull is near-zero once gravity has settled
        // the ring onto the table, leaving the horizontal (X/Z) pull as
        // the meaningful part. This adds the two known tensions plus
        // whatever the spring scale is currently reporting, mapped from
        // the abstract (x, y) vector convention onto world (X, Z).
        const netTension = sumVectors([...this.knownVectors, this.latestScaleVector]);
        body.force.x += netTension.x;
        body.force.z += -netTension.y;

        const distance = Math.hypot(
            body.position.x - PLATFORM_CENTER_WORLD_XZ.x,
            body.position.z - PLATFORM_CENTER_WORLD_XZ.z
        );

        const isBalanced = distance < BALANCE_TOLERANCE_M;
        // Only fire the LabState transition on the edge (unbalanced -> balanced),
        // not every frame the ring happens to sit near centre. Otherwise this
        // would spam the durable event log every ~16ms while balanced.
        if (isBalanced && !this.wasBalanced) {
            LabState.setActive("scale", "balanced", { ringOffsetM: Math.round(distance * 1000) / 1000 });
        }
        this.wasBalanced = isBalanced;
        },

        remove() {
        this.el.sceneEl.removeEventListener("reading-update", this.onReadingUpdate);
        },
  });
}