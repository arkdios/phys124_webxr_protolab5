// Tiny shared flag for one specific cross-component coordination need:
// adjustable-look.js needs to know whether grabbable.js currently has an
// object mid-drag, so it can suppress camera rotation for that click
// instead of fighting it. Kept as its own module (not folded into
// LabState) because it's a transient per-frame UI concern, not a durable
// lab-progress milestone, routing it through LabState.setActive() would
// spam the REST event log on every grab/release.

let dragging = false;

export function setDraggingObject(value) {
    dragging = value;
}

export function isDraggingObject() {
    return dragging;
}