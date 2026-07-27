import { io } from "socket.io-client";

const serverUrl = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

export function createSocket() {
  return io(serverUrl, {
    transports: ["websocket", "polling"],
    autoConnect: true
  });
}
