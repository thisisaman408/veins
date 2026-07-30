import { io } from "socket.io-client";

const serverUrl = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

const SESSION_KEY = "findme_session";

export function createSocket() {
  return io(serverUrl, {
    transports: ["websocket", "polling"],
    autoConnect: true
  });
}

/** Persist the player's room identity across refreshes (tab-scoped). */
export function saveSession(roomCode, slot) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, slot }));
  } catch (_) { /* storage unavailable */ }
}

/** Returns { roomCode, slot } if a saved session exists, else null. */
export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.roomCode && data?.slot) return data;
    return null;
  } catch (_) {
    return null;
  }
}

/** Call on explicit exit or disconnection caused by the other player leaving. */
export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (_) { /* ignore */ }
}
