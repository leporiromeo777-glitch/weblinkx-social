import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts", "controllo/src/**/*.test.ts"],
    environment: "node",
  },
});
