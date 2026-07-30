// WebSocket half of the hybrid protocol. Chosen for anything that should
// feel instant: live spring-scale readings now, streamed chatbot tokens
// later. A plain request/response REST call can't push data to the
// client without polling - a WebSocket keeps one open connection either
// side can write to at any time.
//
// Uses private class fields (#) so nothing outside this file can reach
// into #socket or #listeners directly - same encapsulation goal as the
// closure pattern in lab-state.js, expressed with class syntax instead.

const SOCKET_URL = "wss://localhost/ws/lab"; // placeholder — not a live backend yet
const INITIAL_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 8000;

export class SocketClient {
    #socket = null;
    #listeners = new Map(); // eventName -> Set<handler>
    #reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    #reconnectTimer = null;
    #manuallyClosed = false;

    get isConnected() {
        return this.#socket?.readyState === WebSocket.OPEN;
    }

    connect() {
        if (window.__LAB_BACKEND_DISABLED__) {
        console.log("[socket-client] disabled — skipping WebSocket connection (no backend yet)");
        return;
        }

        this.#manuallyClosed = false;

        try {
        this.#socket = new WebSocket(SOCKET_URL);
        } catch (err) {
        console.warn("[socket-client] failed to construct WebSocket:", err.message);
        this.#scheduleReconnect();
        return;
        }

        this.#socket.addEventListener("open", () => {
        console.log("[socket-client] connected");
        this.#reconnectDelay = INITIAL_RECONNECT_DELAY_MS; // reset backoff after a successful connect
        this.#emit("open");
        });

        this.#socket.addEventListener("message", (evt) => {
        let data;
        try {
            data = JSON.parse(evt.data);
        } catch {
            data = evt.data; // not JSON — pass through raw
        }
        this.#emit("message", data);
        });

        this.#socket.addEventListener("close", () => {
        this.#emit("close");
        if (!this.#manuallyClosed) this.#scheduleReconnect();
        });

        this.#socket.addEventListener("error", (evt) => {
        // The browser fires 'close' immediately after 'error' for a failed
        // socket, so reconnect scheduling happens in the close handler —
        // doing it here too would double-schedule.
        console.warn("[socket-client] socket error:", evt);
        });
    }

    /** Returns true if the payload was actually sent. */
    send(payload) {
        if (!this.isConnected) return false;
        this.#socket.send(JSON.stringify(payload));
        return true;
    }

    /** Subscribe to 'open' or 'message' or 'close'. Returns an unsubscribe function. */
    on(eventName, handler) {
        if (!this.#listeners.has(eventName)) this.#listeners.set(eventName, new Set());
        this.#listeners.get(eventName).add(handler);
        return () => this.#listeners.get(eventName)?.delete(handler);
    }

    disconnect() {
        this.#manuallyClosed = true;
        clearTimeout(this.#reconnectTimer);
        this.#socket?.close();
    }

    #emit(eventName, data) {
        for (const handler of this.#listeners.get(eventName) ?? []) {
        handler(data);
        }
    }

    #scheduleReconnect() {
        clearTimeout(this.#reconnectTimer);
        this.#reconnectTimer = setTimeout(() => this.connect(), this.#reconnectDelay);
        // Exponential backoff, capped — avoids hammering a backend that's down.
        this.#reconnectDelay = Math.min(this.#reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
    }
}