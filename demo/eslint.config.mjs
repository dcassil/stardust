// @ts-check
/**
 * Strict guard-rails ESLint config for the standalone DEMO consumer project.
 *
 * Module-boundary scheme (eslint-plugin-boundaries), mirrored in
 * `demo/.dependency-cruiser.cjs`:
 *   - `site` and `admin` are independent apps. `site` must NEVER import `admin`
 *     and `admin` must NEVER import `site` (and vice-versa) — no shared app
 *     internals.
 *   - Both may import `shared` (via the `@demo/shared/*` aliases) and the
 *     published `@stardust-cms/*` / `versioned-content-engine` packages.
 *   - `shared` is a LEAF: it may not import either app.
 *   - `e2e` is Playwright test code; it may import anything.
 */
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import reactHooks from "eslint-plugin-react-hooks";

const SIZE_COMPLEXITY_RULES = {
  "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": [
    "error",
    { max: 80, skipBlankLines: true, skipComments: true },
  ],
  complexity: ["error", 12],
  "max-depth": ["error", 4],
  "max-params": ["error", 4],
  "max-nested-callbacks": ["error", 3],
};

const ESCAPE_HATCH_RULES = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
  "@typescript-eslint/ban-ts-comment": "error",
  "@eslint-community/eslint-comments/no-use": ["error", { allow: [] }],
};

const IMPORT_RULES = {
  "import/no-cycle": ["error", { maxDepth: Infinity }],
  "import/no-useless-path-segments": ["error", { noUselessIndex: true }],
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: ["../../**", "../../../**"],
          message:
            "Deep relative import banned: import from a module's public entry (or the @demo/shared alias), not across 2+ parent dirs.",
        },
      ],
    },
  ],
};

// Patterns are relative to this config's directory (`demo/`), which is the
// eslint root when the demo is linted (`eslint .` from `demo/`). They must NOT
// carry a `demo/` prefix or they never match the actual file paths (`site/...`)
// and the boundaries rule silently becomes a no-op.
const BOUNDARY_ELEMENTS = [
  { type: "shared", pattern: "shared/**", mode: "file" },
  { type: "site", pattern: "site/**", mode: "file" },
  { type: "admin", pattern: "admin/**", mode: "file" },
  { type: "e2e", pattern: "e2e/**", mode: "file" },
];

const BOUNDARY_POLICIES = [
  {
    from: { element: { type: "shared" } },
    allow: { to: { element: { type: "shared" } } },
  },
  {
    from: { element: { type: "site" } },
    allow: { to: { element: { types: { anyOf: ["site", "shared"] } } } },
  },
  {
    from: { element: { type: "admin" } },
    allow: { to: { element: { types: { anyOf: ["admin", "shared"] } } } },
  },
  {
    from: { element: { type: "e2e" } },
    allow: {
      to: { element: { types: { anyOf: ["e2e", "shared", "site", "admin"] } } },
    },
  },
];

const typeAwareRules = {
  ...SIZE_COMPLEXITY_RULES,
  ...ESCAPE_HATCH_RULES,
  ...IMPORT_RULES,
  ...reactHooks.configs.recommended.rules,
  "boundaries/dependencies": [
    "error",
    {
      default: "disallow",
      message:
        "Boundary violation: '${file.type}' may not import '${dependency.type}'. site and admin must not import each other; both go through @demo/shared. Allowed edges are declared in demo/eslint.config.mjs.",
      policies: BOUNDARY_POLICIES,
    },
  ],
  // The demo's cross-element imports go through subpath aliases
  // (`@demo/shared/store`, `@demo/shared/content-model`) rather than a single
  // element-root `index.ts`, so a uniform `entry-point` glob does not apply.
  // The authoritative enforcement is the `dependencies` EDGE policy above
  // (site never imports admin, and vice-versa; both may import shared),
  // preserved 1:1 from the previous `element-types` rules.
  "boundaries/no-unknown-dependencies": "error",
};

/** Build a type-aware block for one demo sub-project's tsconfig. */
function projectBlock(files, project) {
  return {
    files,
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: { project, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      boundaries,
      import: importPlugin,
      "@eslint-community/eslint-comments": eslintComments,
      "react-hooks": reactHooks,
    },
    settings: {
      "boundaries/elements": BOUNDARY_ELEMENTS,
      "boundaries/include": ["**/*"],
      // The `boundaries/elements` `mode` descriptor is deprecated in v7;
      // migrating it changes matching semantics and is out of scope for this
      // rule migration. Silence the residual descriptor deprecation notice.
      "boundaries/legacy-warnings": false,
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project },
      },
    },
    rules: typeAwareRules,
  };
}

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "**/dist/**",
      "test-results/**",
      "**/*.config.*",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  // Loose TS (Playwright e2e + vitest setup) — parsed by the TS parser but not
  // type-checked (not part of any app tsconfig's program).
  {
    files: ["e2e/**/*.ts", "vitest.setup.ts"],
    extends: [...tseslint.configs.recommended],
  },
  projectBlock(["site/src/**/*.{ts,tsx}"], "./site/tsconfig.json"),
  projectBlock(["admin/src/**/*.{ts,tsx}"], "./admin/tsconfig.json"),
  projectBlock(["shared/src/**/*.{ts,tsx}"], "./shared/tsconfig.json"),
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.e2e.ts",
      "e2e/**",
      "vitest.setup.ts",
    ],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "max-nested-callbacks": "off",
      "boundaries/dependencies": "off",
      "no-restricted-imports": "off",
    },
  },
);
