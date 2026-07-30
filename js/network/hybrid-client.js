// Single entry point the rest of the app talks to. This is what makes
// the protocol "hybrid": it decides WebSocket vs REST per call so
// lab-state.js and the components never need to know the transport:
//
//   init()          -> REST createSession(), then opens the WebSocket
//   sendRealtime()  -> WebSocket if connected, else falls back to REST
//                      (delivery guaranteed even if the socket is down,
//                      just without the low-latency win)
//   logEvent()      -> always REST (durable log; doesn't need to be
//                      instant, and shouldn't be lost if a socket drops)

import { createSession, postLabEvent } from "./rest-client.js";
import { SocketClient } from "./socket-client.js";

const socket = new SocketClient();
let sessionId = null;

export async function init(studentContext = {}) {
    const session = await createSession(studentContext);
    sessionId = session.sessionId;
    socket.connect();
    return sessionId;
}

/**
 * Time-sensitive event (e.g. a live spring-scale reading). Prefers the
 * WebSocket; falls back to REST if it's not connected, so the event
 * still arrives, just without the instant-delivery guarantee.
 */
export async function sendRealtime(payload) {
    const withSession = { ...payload, sessionId };
    const sentOverSocket = socket.send(withSession);
    if (sentOverSocket) return { ok: true, transport: "websocket" };

    try {
        await postLabEvent(withSession);
        return { ok: true, transport: "rest-fallback" };
    } catch (err) {
        console.warn("[hybrid-client] both transports failed:", err.message);
        return { ok: false, transport: "none" };
    }
}

/**
 * Durable milestone event (e.g. "balance achieved"). Always REST: no
 * reason to risk a one-time event on a socket that might be mid-reconnect.
 */
export function logEvent(payload) {
    return postLabEvent({ ...payload, sessionId });
}

/** Subscribe to raw messages pushed from the backend (future: chatbot tokens). */
export function onServerMessage(handler) {
    return socket.on("message", handler);
}

/** Subscribe to connection state changes, e.g. to drive a UI status badge. */
export function onConnectionChange(handler) {
    const unsubOpen = socket.on("open", () => handler(true));
    const unsubClose = socket.on("close", () => handler(false));
    return () => {
        unsubOpen();
        unsubClose();
    };
}

export function isConnected() {
    return socket.isConnected;
}