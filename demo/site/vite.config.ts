import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { demoAliases, demoDedupe } from "../shared/aliases";

/**
 * Demo site dev server. Fixed port so the admin can embed it at a known,
 * explicit origin (NFR-002). `strictPort` fails loudly rather than drifting to a
 * port the admin isn't expecting.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
  resolve: {
    alias: demoAliases,
    dedupe: demoDedupe,
  },
});
