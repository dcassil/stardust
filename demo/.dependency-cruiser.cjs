/**
 * dependency-cruiser config for the standalone DEMO. Mirrors the ESLint
 * `eslint-plugin-boundaries` edges:
 *   - site and admin are independent apps and must NEVER import each other.
 *   - both may import shared (via the @demo/shared aliases) + published packages.
 *   - shared is a LEAF: it may not import either app.
 *
 * Run: `npm run depcruise` (from demo/).
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make modules impossible to reason about.",
      from: {},
      to: { circular: true },
    },
    {
      name: "site-not-admin",
      severity: "error",
      comment: "site must NEVER import admin — both go through @demo/shared.",
      from: { path: "^site/" },
      to: { path: "^admin/" },
    },
    {
      name: "admin-not-site",
      severity: "error",
      comment: "admin must NEVER import site — both go through @demo/shared.",
      from: { path: "^admin/" },
      to: { path: "^site/" },
    },
    {
      name: "shared-is-leaf",
      severity: "error",
      comment: "shared is a LEAF: it may not import either app.",
      from: { path: "^shared/" },
      to: { path: "^(site|admin)/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.base.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      // Resolve the `@demo/shared/*` aliases the apps use.
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    exclude: {
      path: [
        "node_modules",
        "\\.test\\.tsx?$",
        "\\.e2e\\.ts$",
        "(^|/)dist/",
        "vitest.setup.ts",
      ],
    },
  },
};
