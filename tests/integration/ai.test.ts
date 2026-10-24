import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User } from "../../src/models/User";
import { reviewSchema } from "../../src/schemas/review";

const secret = "gt5-local-test-secret-never-used-in-production";
let database: MongoMemoryServer;
let server: Server;
let baseUrl: string;
let token: string;

before(async () => {
  database = await MongoMemoryServer.create({
    binary: { downloadDir: join(tmpdir(), "itelect4-mongodb-binaries") },
  });
  process.env.MONGODB_URI = database.getUri("ai_test");
  process.env.JWT_SECRET = secret;
  process.env.CORS_ORIGIN = "http://localhost:5173";
  process.env.GEMINI_API_KEY = "local-simulation-key";
  // The SDK supports this test endpoint override; never send a real key to the simulation.
  process.env.GOOGLE_GEMINI_BASE_URL = "http://127.0.0.1:4900/gemini";
  const { default: app } = await import("../../src/app");
  await mongoose.connect(process.env.MONGODB_URI);
  await User.init();
  const user = await User.create({
    name: "AI Student",
    email: "ai@example.test",
    password: "TestPassword123!",
  });
  token = jwt.sign({ userId: String(user._id) }, secret, { expiresIn: "1h" });
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  if (database) await database.stop();
});

async function request(body: unknown, auth = token) {
  const response = await fetch(`${baseUrl}/api/ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  };
}

async function newToken(label: string) {
  const user = await User.create({
    name: label,
    email: `${label}@example.test`,
    password: "TestPassword123!",
  });
  return jwt.sign({ userId: String(user._id) }, secret, { expiresIn: "1h" });
}

test("AI is private and validates input before contacting the provider", async () => {
  assert.equal(
    (await request({ prompt: "My bottle has initials underneath." }, ""))
      .status,
    401,
  );
  const auth = await newToken("validation");
  for (const body of [
    {},
    { prompt: "short" },
    { prompt: "a".repeat(2001) },
    { prompt: "a".repeat(20), status: "approved" },
  ]) {
    assert.equal((await request(body, auth)).status, 400);
  }
});

test("a missing key fails only the AI request with an actionable message", async () => {
  delete process.env.GEMINI_API_KEY;
  try {
    const result = await request({
      prompt: "My blue bottle has initials underneath.",
    });
    assert.equal(result.status, 500);
    assert.match(result.body.message, /GEMINI_API_KEY/);
    assert.equal((await fetch(`${baseUrl}/api/items`)).status, 200);
  } finally {
    process.env.GEMINI_API_KEY = "local-simulation-key";
  }
});

test("the real SDK returns a checked review through the mounted API", async () => {
  const result = await request({
    prompt: "My blue bottle has initials underneath and I have a photo.",
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(reviewSchema.safeParse(result.body).success, true);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.ok(result.headers.has("ratelimit"));
});

for (const [fixture, expected] of [
  ["quota", 429],
  ["server", 502],
  ["html", 502],
  ["json", 502],
  ["schema", 502],
  ["blocked", 502],
  ["timeout", 502],
] as const) {
  test(
    `provider ${fixture} produces a safe ${expected} response`,
    { timeout: 30000 },
    async () => {
      const auth = await newToken(fixture);
      const result = await request(
        { prompt: `My bottle has initials. fixture:${fixture}` },
        auth,
      );
      assert.equal(result.status, expected, JSON.stringify(result.body));
      assert.equal(Object.keys(result.body).join(), "message");
      assert.doesNotMatch(
        result.body.message,
        /Private provider error|local-simulation-key/,
      );
    },
  );
}

test("the limiter counts accounts separately even on the same IP", async () => {
  const first = await newToken("limit-first");
  const second = await newToken("limit-second");
  for (let count = 0; count < 5; count++)
    assert.equal((await request({ prompt: "short" }, first)).status, 400);
  const limited = await request({ prompt: "short" }, first);
  assert.equal(limited.status, 429);
  assert.ok(limited.headers.has("retry-after"));
  assert.equal((await request({ prompt: "short" }, second)).status, 400);
});
