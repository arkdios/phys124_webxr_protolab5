/**
   * Convert a force given as (magnitude, angle) into (x, y) components.
   * Angle is in degrees, measured counterclockwise from the horizontal
   */
export function polarToCartesian(magnitude, angleDeg) {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
        x: magnitude * Math.cos(angleRad),
        y: magnitude * Math.sin(angleRad),
    };
}

/** Sum a list of {x, y} vectors component-wise (ΣFx, ΣFy from the manual). */
export function sumVectors(vectors) {
    return vectors.reduce(
        (total, v) => ({ x: total.x + v.x, y: total.y + v.y }),
        { x: 0, y: 0 }
    );
}

/** Magnitude of a {x, y} vector. Math.hypot avoids manual sqrt(x*x + y*y). */
export function vectorMagnitude(v) {
    return Math.hypot(v.x, v.y);
}

/** Angle of a {x, y} vector in degrees, normalized to 0-360. */
export function vectorAngleDeg(v) {
    const deg = (Math.atan2(v.y, v.x) * 180) / Math.PI;
    return deg < 0 ? deg + 360 : deg;
}

/** Convert a hanging mass (kg) into the downward force it applies (N). */
export function massToForce(massKg, gravityMS2) {
    return massKg * gravityMS2;
}