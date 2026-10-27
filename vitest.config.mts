import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/gt6/*.test.ts"],
    environment: "node",
    clearMocks: true,
    env: {
      MONGODB_URI: "mongodb://127.0.0.1:1/gt6_unused",
      CORS_ORIGIN: "http://localhost:5173",
    },
  },
});
