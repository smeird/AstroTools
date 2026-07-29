import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "app/**/*.test.{ts,tsx}",
      "components/**/*.test.{ts,tsx}",
      "features/**/*.test.{ts,tsx}",
      "lib/**/*.test.ts",
    ],
    setupFiles: ["./vitest.setup.ts"],
  },
});
