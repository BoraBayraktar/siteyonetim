import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/modules/**/*.test.ts", "packages/platform-*/**/*.test.ts"],
  },
});
