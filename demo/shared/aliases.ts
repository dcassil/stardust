/**
 * Shared Vite resolve aliases for both demo apps.
 *
 * The demo is now a STANDALONE consumer project: `@stardust-cms/iframe-adapter`,
 * `@stardust-cms/dashboard`, `versioned-content-engine`, and the frame-link peers
 * all resolve normally from `demo/node_modules` (published npm packages) — no
 * aliases into the repo's `src/` remain. Only the internal `@demo/shared/*`
 * source modules are aliased here so both apps import them by a stable specifier.
 * React is deduped so the whole tree shares one instance.
 */

import { fileURLToPath } from "node:url";

export const demoAliases: Record<string, string> = {
  "@demo/shared/content-model": fileURLToPath(
    new URL("./src/content-model.ts", import.meta.url),
  ),
  "@demo/shared/store": fileURLToPath(
    new URL("./src/store/index.ts", import.meta.url),
  ),
};

export const demoDedupe: string[] = ["react", "react-dom"];
