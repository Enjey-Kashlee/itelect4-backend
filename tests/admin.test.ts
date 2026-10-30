import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose, { Types } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../src/models/User";
import { Item } from "../src/models/Item";
import { Claim } from "../src/models/Claim";

const secret = "admin-feature-test-secret-with-at-least-32-characters";
const password = "TemporaryTestPassword123!";
let database: MongoMemoryReplSet;
let server: Server;
let baseUrl: string;
let adminId: string;
let studentId: string;
let otherId: string;
let adminToken: string;
let studentToken: string;

async function request(
  method: string,
  path: string,
  body?: unknown,
  token: string | null = adminToken,
) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function lostItem() {
  return Item.create({
    title: "Campus umbrella",
    description: "Black folding umbrella.",
    location: "Library",
    reportedById: studentId,
    status: "lost",
  });
}

before(async () => {
  database = await MongoMemoryReplSet.create({
    binary: { downloadDir: join(tmpdir(), "itelect4-mongodb-binaries") },
    replSet: { count: 1 },
  });
  await mongoose.connect(database.getUri("admin_test"));
  await User.init();
  await Claim.init();
  const admin = await User.create({
    name: "Office Admin",
    email: "admin@example.test",
    password,
    role: "security_admin",
  });
  adminId = String(admin._id);
  const student = await User.create({
    name: "Student One",
    email: "student@example.test",
    password,
  });
  const other = await User.create({
    name: "Student Two",
    email: "other@example.test",
    password,
  });
  studentId = String(student._id);
  otherId = String(other._id);
  adminToken = jwt.sign({ userId: adminId }, secret, { expiresIn: "1h" });
  studentToken = jwt.sign(
    { userId: studentId, role: "security_admin" },
    secret,
    { expiresIn: "1h" },
  );
  process.env.MONGODB_URI = database.getUri("admin_test");
  process.env.JWT_SECRET = secret;
  process.env.CORS_ORIGIN = "http://localhost:5173";
  const { createApp } = await import("../src/app");
  server = createApp({
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: secret,
    corsOrigins: ["http://localhost:5173"],
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
  await mongoose.disconnect();
  if (database) await database.stop();
});

test("admin endpoints reject missing sessions and student tokens even with a forged role", async () => {
  for (const path of ["/api/admin/students", "/api/admin/claims"]) {
    assert.equal((await request("GET", path, undefined, null)).status, 401);
    assert.equal(
      (await request("GET", path, undefined, studentToken)).status,
      403,
    );
  }
  assert.equal(
    (
      await request(
        "PATCH",
        `/api/admin/claims/${new Types.ObjectId()}/status`,
        { status: "approved" },
        studentToken,
      )
    ).status,
    403,
  );
});

test("only one admin can exist, even when the original is inactive", async () => {
  await User.updateOne({ _id: adminId }, { isActive: false });
  try {
    await assert.rejects(
      User.create({
        name: "Second Admin",
        email: "second@example.test",
        password,
        role: "security_admin",
      }),
      (error: unknown) => (error as { code?: number }).code === 11000,
    );
    assert.equal((await request("GET", "/api/admin/claims")).status, 401);
  } finally {
    await User.updateOne({ _id: adminId }, { isActive: true });
  }
});

test("admin item entry records the selected student and exposes no student email publicly", async () => {
  const body = {
    title: "  Silver keys  ",
    description: " Two keys on a ring. ",
    location: " Main gate ",
    reportedById: studentId,
  };
  assert.equal((await request("POST", "/api/items", body, null)).status, 401);
  assert.equal(
    (await request("POST", "/api/items", body, studentToken)).status,
    403,
  );
  const directory = await request("GET", "/api/admin/students");
  assert.equal(directory.status, 200);
  assert.deepEqual(
    directory.body.find((entry: { id: string }) => entry.id === studentId),
    { id: studentId, name: "Student One", email: "student@example.test" },
  );
  assert.equal(
    directory.body.some((entry: { id: string }) => entry.id === adminId),
    false,
  );
  const created = await request("POST", "/api/items", body);
  assert.equal(created.status, 201);
  assert.equal(created.body.title, "Silver keys");
  assert.equal(created.body.status, "lost");
  assert.equal(created.body.reportedById, studentId);
  assert.deepEqual(created.body.reportedBy, {
    id: studentId,
    name: "Student One",
  });
  for (const changes of [
    { status: "found" },
    { reportedById: adminId },
    { reportedById: String(new Types.ObjectId()) },
    { title: "x" },
    { description: " " },
    { location: "" },
  ]) {
    assert.equal(
      (await request("POST", "/api/items", { ...body, ...changes })).status,
      400,
    );
  }
  assert.equal(
    (
      await request("POST", "/api/claims", {
        itemId: created.body.id,
        proofDescription: "My keys have initials underneath.",
      })
    ).status,
    403,
  );
});

test("approval closes the item, rejects other pending claims, and freezes reviewed records", async () => {
  const item = await lostItem();
  const selected = await Claim.create({
    itemId: item._id,
    claimantId: studentId,
    proofDescription: "My initials are under the handle.",
  });
  const other = await Claim.create({
    itemId: item._id,
    claimantId: otherId,
    proofDescription: "The underside has a blue sticker.",
  });
  const result = await request(
    "PATCH",
    `/api/admin/claims/${selected._id}/status`,
    { status: "approved" },
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.claim.status, "approved");
  assert.equal(result.body.rejectedOtherClaimsCount, 1);
  assert.equal(result.body.claim.reviewedById, adminId);
  assert.ok(result.body.claim.reviewedAt);
  assert.equal((await Item.findById(item._id))!.status, "found");
  assert.equal((await Claim.findById(other._id))!.status, "rejected");
  for (const method of ["PATCH", "DELETE"])
    assert.equal(
      (
        await request(
          method,
          `/api/claims/${selected._id}`,
          method === "PATCH"
            ? { proofDescription: "Changed proof after approval." }
            : undefined,
          studentToken,
        )
      ).status,
      409,
    );
  assert.equal(
    (
      await request("PATCH", `/api/admin/claims/${selected._id}/status`, {
        status: "rejected",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(
        "POST",
        "/api/claims",
        {
          itemId: String(item._id),
          proofDescription: "A late claim for this umbrella.",
        },
        studentToken,
      )
    ).status,
    409,
  );
  const list = await request("GET", "/api/admin/claims?status=approved");
  const entry = list.body.find(
    (claim: { id: string }) => claim.id === String(selected._id),
  );
  assert.deepEqual(entry.claimant, { id: studentId, name: "Student One" });
  assert.equal(entry.item.status, "found");
  assert.equal(
    (await request("GET", "/api/admin/claims?status=other")).status,
    400,
  );
  const mine = await request("GET", "/api/claims", undefined, studentToken);
  assert.equal(
    mine.body.some((claim: { id: string }) => claim.id === String(other._id)),
    false,
  );
});

test("rejection and failed approval do not close unrelated items or overwrite decisions", async () => {
  const item = await lostItem();
  const claim = await Claim.create({
    itemId: item._id,
    claimantId: studentId,
    proofDescription: "My initials are under the handle.",
  });
  assert.equal(
    (
      await request("PATCH", `/api/admin/claims/${claim._id}/status`, {
        status: "pending",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("PATCH", `/api/admin/claims/${claim._id}/status`, {
        status: "approved",
        claimantId: otherId,
      })
    ).status,
    400,
  );
  await Item.updateOne({ _id: item._id }, { status: "found" });
  assert.equal(
    (
      await request("PATCH", `/api/admin/claims/${claim._id}/status`, {
        status: "approved",
      })
    ).status,
    409,
  );
  assert.equal((await Claim.findById(claim._id))!.status, "pending");
  await Item.updateOne({ _id: item._id }, { status: "lost" });
  assert.equal(
    (
      await request("PATCH", `/api/admin/claims/${claim._id}/status`, {
        status: "rejected",
      })
    ).status,
    200,
  );
  assert.equal((await Item.findById(item._id))!.status, "lost");
});

test("concurrent approvals and submissions cannot leave two winners or late pending claims", async () => {
  const item = await lostItem();
  const first = await Claim.create({
    itemId: item._id,
    claimantId: studentId,
    proofDescription: "My initials are under the handle.",
  });
  const second = await Claim.create({
    itemId: item._id,
    claimantId: otherId,
    proofDescription: "The underside has a blue sticker.",
  });
  const results = await Promise.all([
    request("PATCH", `/api/admin/claims/${first._id}/status`, {
      status: "approved",
    }),
    request("PATCH", `/api/admin/claims/${second._id}/status`, {
      status: "approved",
    }),
    request(
      "POST",
      "/api/claims",
      {
        itemId: String(item._id),
        proofDescription: "A simultaneous ownership claim.",
      },
      studentToken,
    ),
  ]);
  assert.deepEqual(
    results
      .slice(0, 2)
      .map((result) => result.status)
      .sort(),
    [200, 409],
  );
  assert.ok([201, 409].includes(results[2].status));
  assert.equal(
    await Claim.countDocuments({ itemId: item._id, status: "approved" }),
    1,
  );
  assert.equal(
    await Claim.countDocuments({ itemId: item._id, status: "pending" }),
    0,
  );
});

test("a racing reassignment cannot leave a pending claim on an approved item", async () => {
  const source = await lostItem();
  const target = await lostItem();
  const moving = await Claim.create({
    itemId: source._id,
    claimantId: studentId,
    proofDescription: "My initials are under the handle.",
  });
  const winner = await Claim.create({
    itemId: target._id,
    claimantId: otherId,
    proofDescription: "The underside has a blue sticker.",
  });
  const [approval, reassignment] = await Promise.all([
    request("PATCH", `/api/admin/claims/${winner._id}/status`, {
      status: "approved",
    }),
    request(
      "PATCH",
      `/api/claims/${moving._id}`,
      { itemId: String(target._id) },
      studentToken,
    ),
  ]);
  assert.equal(approval.status, 200);
  assert.ok([200, 409].includes(reassignment.status));
  assert.equal(
    await Claim.countDocuments({ itemId: target._id, status: "pending" }),
    0,
  );
});

test("failure halfway through approval rolls back item, decision, and competing rejections", async (t) => {
  const item = await lostItem();
  const selected = await Claim.create({
    itemId: item._id,
    claimantId: studentId,
    proofDescription: "My initials are under the handle.",
  });
  await Claim.create({
    itemId: item._id,
    claimantId: otherId,
    proofDescription: "The underside has a blue sticker.",
  });
  t.mock.method(Claim, "updateMany", () => {
    throw new Error("Simulated write failure");
  });
  assert.equal(
    (
      await request("PATCH", `/api/admin/claims/${selected._id}/status`, {
        status: "approved",
      })
    ).status,
    500,
  );
  assert.equal((await Item.findById(item._id))!.status, "lost");
  assert.equal(
    await Claim.countDocuments({ itemId: item._id, status: "pending" }),
    2,
  );
  assert.equal((await Claim.findById(selected._id))!.reviewedAt, undefined);
});

test("provisioning preserves accounts, rejects occupied email, and is safe under concurrent setup", async () => {
  const { setupAdmin } = await import("../src/data/setupAdmin");
  const original = await User.findById(adminId).select("+password");
  assert.equal(
    await setupAdmin({
      name: "Replacement",
      email: "replacement@example.test",
      password,
    }),
    false,
  );
  assert.equal(
    (await User.findById(adminId).select("+password"))!.password,
    original!.password,
  );
  await User.deleteOne({ _id: adminId });
  await assert.rejects(
    setupAdmin({
      name: "Office Admin",
      email: "student@example.test",
      password,
    }),
    /already registered/,
  );
  assert.equal((await User.findById(studentId))!.role, "student");
  await assert.rejects(
    setupAdmin({
      name: "Office Admin",
      email: "newadmin@example.test",
      password: "short",
    }),
  );
  const results = await Promise.all([
    setupAdmin({ name: "Admin One", email: "one@example.test", password }),
    setupAdmin({ name: "Admin Two", email: "two@example.test", password }),
  ]);
  assert.deepEqual(results.sort(), [false, true]);
  assert.equal(await User.countDocuments({ role: "security_admin" }), 1);
  const created = await User.findOne({ role: "security_admin" }).select(
    "+password",
  );
  assert.equal(await bcrypt.compare(password, created!.password), true);
  await User.updateOne({ _id: created!._id }, { isActive: false });
  assert.equal(
    await setupAdmin({
      name: "Another",
      email: "another@example.test",
      password,
    }),
    false,
  );
});
