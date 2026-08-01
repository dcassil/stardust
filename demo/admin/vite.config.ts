import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { demoAliases, demoDedupe } from "../shared/aliases";

/**
 * Demo admin dev server. Fixed port 5173 = the explicit origin the demo site
 * expects to be embedded by (NFR-002). `strictPort` fails loudly on conflict.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: demoAliases,
    dedupe: demoDedupe,
  },
  build: {
    rollupOptions: {
      // `socket.io-client` is a lazy `await import()` inside the library's
      // optional SocketIoPresenceProvider. The demo uses the mock presence
      // provider and never connects a socket, so the dependency is absent by
      // design. Externalizing keeps that dynamic import optional instead of
      // forcing socket.io-client into the demo's dependencies just to build.
      external: ["socket.io-client"],
    },
  },
});
