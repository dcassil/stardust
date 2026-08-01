/**
 * Demo test setup: registers @testing-library/jest-dom-style matchers via
 * @testing-library/react's automatic cleanup. Kept minimal — the store tests
 * need no DOM; the admin component tests rely on jsdom (configured in
 * vitest.config.ts) and testing-library's auto-cleanup.
 */

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
