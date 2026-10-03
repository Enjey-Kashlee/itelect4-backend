import assert from "node:assert/strict";
import test from "node:test";

test("configuration requires a database URI, strong secret, and valid port", async () => {
  const { readConfig } = await import("../src/config/env");
  const env = { MONGODB_URI: "mongodb://127.0.0.1/itelect4", JWT_SECRET: "a".repeat(32) };
  assert.equal(readConfig(env).port, 4000);
  assert.deepEqual(readConfig(env).corsOrigins, ["http://localhost:5173"]);
  assert.throws(() => readConfig({ ...env, MONGODB_URI: "" }), /MONGODB_URI/);
  assert.throws(() => readConfig({ ...env, MONGODB_URI: "https://example.com" }), /MONGODB_URI/);
  assert.throws(() => readConfig({ ...env, JWT_SECRET: "short" }), /JWT_SECRET/);
  for (const port of ["0", "65536", "4000abc", "3.5"]) {
    assert.throws(() => readConfig({ ...env, PORT: port }), /PORT/);
  }
  assert.deepEqual(readConfig({ ...env, CORS_ORIGIN: "http://localhost:5173, https://example.com" }).corsOrigins,
    ["http://localhost:5173", "https://example.com"]);
});
