import { defineConfig } from "vitest/config";

// Root config: `pnpm vitest` here runs every package's tests as projects.
// Each package also has its own `test` script (used by `pnpm -r test`).
export default defineConfig({
  test: {
    projects: ["packages/*", "apps/*"],
  },
});
