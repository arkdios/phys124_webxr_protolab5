// js/network/rest-client.js
//
// REST half of the hybrid WebSocket + REST protocol (REST handles the non-realtime
// half of the contract: requests that don't need to feel instant and are safe to
// retry - creating a session, and durably logging a lab event. Anything that needs
// to feel live (readings while dragging the spring scale) goes over the WebSocket instead.

const API_BASE = "/api"; // placeholder base path, since it isn't a live backend yet

/**
 * Create a lab session. Called once when the scene loads, before the WebSocket connects,
 * so the socket can be tied to a session id from its very first message.
 *
 * @param {object} studentContext - e.g. { course: "PHYS 124", experiment: "vector-addition-of-forces" }
 */
export async function createSession(studentContext = {}) {
    if (window.__LAB_BACKEND_DISABLED__) {
        const fakeId = `stub-session-${Date.now()}`;
        console.log("[rest-client] disabled — pretending session created:", fakeId);
        return { sessionId: fakeId, stub: true };
    }

    const response = await fetch(`${API_BASE}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentContext),
    });

    if (!response.ok) {
        throw new Error(`createSession failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Durably log a lab event (e.g. "balance achieved"). This is both:
 *   (a) the primary path for events where "eventually delivered" is fine because nothing on screen
 *       is waiting on the response, and
 *   (b) the fallback path hybrid-client.js uses when the WebSocket isn't connected.
 */
export async function postLabEvent(payload) {
    if (window.__LAB_BACKEND_DISABLED__) {
        console.log("[rest-client] disabled — would have POSTed:", payload);
        return { ok: true, stub: true };
    }

    const response = await fetch(`${API_BASE}/lab-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`postLabEvent failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}