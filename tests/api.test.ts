import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { User } from "../src/models/User";
import { Item } from "../src/models/Item";
import { Claim } from "../src/models/Claim";

const jwtSecret = "a-long-test-secret-used-only-for-this-test-suite";
const password = "LearnClaims123!";
const proof = "My initials are engraved on the underside of this item.";
let database: MongoMemoryServer | undefined;
let server: Server | undefined;
let baseUrl = "";
let aliceToken = "";
let bobToken = "";
let aliceId = "";
let itemId = "";
let registration: Awaited<ReturnType<typeof request>>;

async function request(method: string, path: string, body?: unknown, token: string | null = aliceToken) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
}

before(async () => {
  const { createApp } = await import("../src/app");
  database = await MongoMemoryServer.create({ binary: { downloadDir: join(tmpdir(), "itelect4-mongodb-binaries") } });
  await mongoose.connect(database.getUri(), { dbName: "claims_api_test" });
  await User.init();
  server = createApp({ jwtSecret, corsOrigins: ["http://localhost:5173"] }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server!.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  registration = await request("POST", "/api/auth/register", { name: "Alice Student", email: " ALICE@example.com ", password }, null);
  assert.equal(registration.status, 201);
  aliceId = registration.body.id;
  await request("POST", "/api/auth/register", { name: "Bob Student", email: "bob@example.com", password }, null);
  aliceToken = (await request("POST", "/api/auth/login", { email: "alice@example.com", password }, null)).body.token;
  bobToken = (await request("POST", "/api/auth/login", { email: "bob@example.com", password }, null)).body.token;
  const item = await Item.create({ title: "Blue Water Bottle", description: "A bottle with initials underneath.",
    status: "found", location: "Campus Library", reportedById: aliceId });
  itemId = String(item._id);
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  await mongoose.disconnect();
  if (database) await database.stop();
});

test("registration hashes passwords, hides private fields, and normalizes email", async () => {
  assert.equal(registration.body.email, "alice@example.com");
  assert.equal(registration.body.role, "student");
  for (const key of ["password", "_id", "__v"]) assert.equal(key in registration.body, false);
  const user = await User.findById(aliceId).select("+password");
  assert.ok(user);
  assert.notEqual(user.password, password);
  assert.equal(await bcrypt.compare(password, user.password), true);
  assert.equal((await User.findById(aliceId))!.password, undefined);
  const hash = user.password;
  user.name = "Alice Updated";
  await user.save();
  assert.equal(user.password, hash);
  assert.equal("password" in user.toJSON(), false);
  assert.equal((await request("POST", "/api/auth/register", { name: "Other", email: "ALICE@example.com", password })).status, 409);
  assert.equal((await request("POST", "/api/auth/register", { name: "Other", email: "other@example.com", password, role: "security_admin" })).status, 400);
  assert.equal((await request("POST", "/api/auth/register", { name: "Other", email: "short@example.com", password: "short" })).status, 400);
  assert.equal((await request("POST", "/api/auth/register", { name: "Other", email: "long@example.com", password: "é".repeat(40) })).status, 400);
});

test("login issues a two-hour token and gives the same error for wrong credentials", async () => {
  const payload = jwt.verify(aliceToken, jwtSecret) as jwt.JwtPayload;
  assert.equal(payload.userId, aliceId);
  assert.equal(payload.exp! - payload.iat!, 7200);
  const wrongPassword = await request("POST", "/api/auth/login", { email: "alice@example.com", password: "wrong" });
  const unknownEmail = await request("POST", "/api/auth/login", { email: "unknown@example.com", password });
  assert.equal(wrongPassword.status, 401);
  assert.deepEqual(wrongPassword.body, unknownEmail.body);
  assert.equal((await request("POST", "/api/auth/login", { email: { $ne: null }, password })).status, 400);
});

test("every claim method requires authentication and invalid tokens are rejected", async () => {
  for (const [method, path] of [["GET", "/api/claims"], ["GET", "/api/claims/abc"], ["POST", "/api/claims"],
    ["PATCH", "/api/claims/abc"], ["DELETE", "/api/claims/abc"]]) {
    assert.equal((await request(method, path, undefined, null)).status, 401);
  }
  for (const token of ["hello", jwt.sign({ userId: aliceId }, jwtSecret, { expiresIn: -1 }),
    jwt.sign({ userId: aliceId }, jwtSecret, { algorithm: "HS384", expiresIn: "2h" }),
    jwt.sign({ userId: "not-an-id" }, jwtSecret, { expiresIn: "2h" })]) {
    assert.equal((await request("GET", "/api/claims", undefined, token)).status, 401);
  }
});

test("an inactive account cannot log in or use a previously issued token", async () => {
  await request("POST", "/api/auth/register", { name: "Inactive", email: "inactive@example.com", password });
  const login = await request("POST", "/api/auth/login", { email: "inactive@example.com", password });
  await User.updateOne({ email: "inactive@example.com" }, { isActive: false });
  assert.equal((await request("GET", "/api/claims", undefined, login.body.token)).status, 401);
  assert.equal((await request("POST", "/api/auth/login", { email: "inactive@example.com", password })).status, 401);
});

test("a student can create, list, read, edit, and delete their claim", async () => {
  const created = await request("POST", "/api/claims", { itemId, proofDescription: proof });
  assert.equal(created.status, 201);
  assert.equal(created.body.itemId, itemId);
  assert.equal(created.body.claimantId, aliceId);
  assert.equal(created.body.status, "pending");
  assert.equal(typeof created.body.claimedAt, "string");
  assert.equal("_id" in created.body, false);
  const id = created.body.id;
  const listed = await request("GET", "/api/claims");
  assert.ok(listed.body.some((claim: { id: string }) => claim.id === id));
  assert.equal((await request("GET", `/api/claims/${id}`)).status, 200);
  const updated = await request("PATCH", `/api/claims/${id}`, { proofDescription: "There is also a red sticker inside the lid." });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.proofDescription, "There is also a red sticker inside the lid.");
  assert.equal((await request("PATCH", `/api/claims/${id}`, { proofDescription: "short" })).status, 400);
  assert.equal((await request("PATCH", `/api/claims/${id}`, { status: "approved" })).status, 400);
  assert.equal((await request("PATCH", `/api/claims/${id}`, { claimantId: new Types.ObjectId().toString() })).status, 400);
  assert.equal((await request("PATCH", `/api/claims/${id}`, {})).status, 400);
  const deleted = await request("DELETE", `/api/claims/${id}`);
  assert.equal(deleted.status, 204);
  assert.equal(deleted.body, null);
  assert.equal((await request("GET", `/api/claims/${id}`)).status, 404);
  assert.equal((await request("DELETE", `/api/claims/${id}`)).status, 404);
});

test("other users cannot read, edit, delete, or see someone's claim", async () => {
  const created = await request("POST", "/api/claims", { itemId, proofDescription: proof });
  const id = created.body.id;
  assert.equal((await request("GET", `/api/claims/${id}`, undefined, bobToken)).status, 404);
  assert.equal((await request("PATCH", `/api/claims/${id}`, { proofDescription: proof }, bobToken)).status, 404);
  assert.equal((await request("DELETE", `/api/claims/${id}`, undefined, bobToken)).status, 404);
  const listed = await request("GET", "/api/claims", undefined, bobToken);
  assert.equal(listed.body.some((claim: { id: string }) => claim.id === id), false);
  assert.equal((await request("POST", "/api/claims", { itemId, proofDescription: proof, claimantId: aliceId }, bobToken)).status, 400);
  assert.ok(await Claim.findById(id));
});

test("claim requests enforce existing items, valid IDs, and proof limits", async () => {
  const missingId = new Types.ObjectId().toString();
  assert.equal((await request("POST", "/api/claims", { itemId: missingId, proofDescription: proof })).status, 404);
  assert.equal((await request("POST", "/api/claims", { itemId: 101, proofDescription: proof })).status, 400);
  assert.equal((await request("POST", "/api/claims", { itemId })).status, 400);
  assert.equal((await request("POST", "/api/claims", { itemId, proofDescription: "x".repeat(1001) })).status, 400);
  assert.equal((await request("GET", "/api/claims/hello")).status, 400);
  const created = await request("POST", "/api/claims", { itemId, proofDescription: proof });
  assert.equal((await request("PATCH", `/api/claims/${created.body.id}`, { itemId: missingId })).status, 404);
  assert.equal((await request("GET", `/api/claims/${created.body.id}`)).body.itemId, itemId);
});

test("the authenticated item catalogue supplies IDs for claims", async () => {
  const items = await request("GET", "/api/items");
  assert.equal(items.status, 200);
  assert.ok(items.body.some((item: { id: string }) => item.id === itemId));
  assert.equal((await request("GET", `/api/items/${itemId}`)).status, 200);
  assert.equal((await request("GET", "/api/items", undefined, null)).status, 401);
});

test("health, JSON errors, CORS, and malformed request bodies behave consistently", async () => {
  assert.deepEqual((await request("GET", "/api/health", undefined, null)).body, { ok: true, db: true });
  assert.equal((await request("GET", "/api/nope")).status, 404);
  assert.equal((await request("POST", "/api/auth/login", ["unexpected"])).status, 400);
  assert.equal((await request("POST", "/api/auth/login")).status, 400);
  const malformed = await fetch(baseUrl + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  assert.match(malformed.headers.get("content-type")!, /json/);
  const oversized = await request("POST", "/api/auth/login", { email: "x".repeat(40000) });
  assert.equal(oversized.status, 413);
  const allowed = await fetch(baseUrl + "/api/health", { headers: { Origin: "http://localhost:5173" } });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173");
  const forbidden = await fetch(baseUrl + "/api/health", { headers: { Origin: "https://unapproved.example" } });
  assert.equal(forbidden.status, 403);
});

test("seeding twice inserts three sample items once and preserves existing data", async () => {
  const { seedSampleItems } = await import("../src/data/seedItems");
  const beforeCount = await Item.countDocuments();
  const userCount = await User.countDocuments();
  await seedSampleItems();
  await seedSampleItems();
  assert.equal(await Item.countDocuments(), beforeCount + 3);
  assert.equal(await User.countDocuments(), userCount + 1);
  assert.equal((await Item.findById(itemId))!.title, "Blue Water Bottle");
  const reporter = await User.findOne({ email: "sample-reporter@example.invalid" }).select("+password");
  assert.ok(reporter?.password.startsWith("$2"));
  assert.equal(reporter!.role, "student");
});
