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
  // `socket.io-client` is now a REAL dependency: `colab-ui`'s default Socket.IO
  // transport lazily `await import()`s it inside `connect()` to reach the demo
  // `colab` relay. It must therefore be bundled (not externalized) so the
  // presence build/runtime can load it.
});
