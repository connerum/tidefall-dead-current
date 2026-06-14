import { defineConfig } from "vite";

// Dev server config. The game client connects to its own origin's /ws path;
// this proxy forwards WebSocket and HTTP API traffic to the Node server so
// that `npm run dev` (which runs client + server concurrently) works out of
// the box with no extra setup.
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
  },
});
