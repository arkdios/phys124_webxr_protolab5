// Only Case A is wired into this MVP scene. B, C, and D are kept here
// anyway so that adding a case switcher later is a data change, not a
// rebuild: force-ring.js just reads whichever key ACTIVE_CASE_KEY points to.
//
// Angles are in degrees, counterclockwise from the horizontal, matching
// the manual's convention (Figure 5.1). Masses are in kg.

export const EXPERIMENT_CASES = {
    A: {
        label: "Case A",
        knownForces: [
            { massKg: 0.200, angleDeg: 30.0 },
            { massKg: 0.200, angleDeg: 120.0 },
        ],
    },
    B: {
        label: "Case B",
        knownForces: [
            { massKg: 0.200, angleDeg: 30.0 },
            { massKg: 0.150, angleDeg: 80.0 },
        ],
    },
    C: {
        label: "Case C",
        knownForces: [
            { massKg: 0.200, angleDeg: 5.0 },
            { massKg: 0.150, angleDeg: 95.0 },
        ],
    },
    D: {
        label: "Case D",
        knownForces: [
            { massKg: 0.100, angleDeg: 40.0 },
            { massKg: 0.200, angleDeg: 100.0 },
            { massKg: 0.300, angleDeg: 235.0 },
        ],
    },
};

    export const GRAVITY_M_S2 = 9.81;
    
    // only Case A is built into the scene right now.
    export const ACTIVE_CASE_KEY = "A";