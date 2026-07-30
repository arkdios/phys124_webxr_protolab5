// Single source for "what is the student doing right now", aka.
// what will eventually feed the chatbot's context-awareness. Built as a
// closure-based module: 'state' and 'subscribers' are trapped inside
// createLabState()'s scope and unreachable from outside except through
// the four returned functions. Nothing can do 'LabState.state = ...'
// and silently desync the UI from the backend.

import { logEvent } from "./network/hybrid-client.js";

function createLabState() {
    let state = {
        activeObjectId: null,
        step: "idle",
        meta: {},
        updatedAt: null,
    };

    const subscribers = new Set();

    function notify() {
        for (const fn of subscribers) {
            fn({ ...state }); // shallow copy: listeners can read, not mutate
        }
    }

    async function setActive(objectId, step, meta = {}) {
        state = {
        activeObjectId: objectId,
        step,
        meta,
        updatedAt: new Date().toISOString(),
        };
        notify();

        // Discrete milestones go through the durable REST log. This is a failed/stubbed log should never break the scene.
        try {
        await logEvent({ ...state });
        } catch (err) {
        console.warn("[LabState] event log failed (expected - stub has no live endpoint yet):", err.message);
        }
    }

    function reset() {
        return setActive(null, "idle", {});
    }

    function subscribe(fn) {
        subscribers.add(fn);
        fn({ ...state }); // replay current state immediately for new subscribers
        return () => subscribers.delete(fn); // caller gets an unsubscribe function back
    }

    function getState() {
        return { ...state };
    }

    return { setActive, reset, subscribe, getState };
}

export const LabState = createLabState();