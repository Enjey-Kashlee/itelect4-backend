import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { User } from "../src/models/User";
import { connectDatabase } from "../src/config/db";

test("database readiness waits for the unique email index and propagates index failures", async (t) => {
  t.mock.method(mongoose, "connect", async () => mongoose);
  let release!: () => void;
  let ready = false;
  const index = new Promise<void>((resolve) => { release = resolve; });
  const init = t.mock.method(User, "init", async () => { await index; return User; });
  const connection = connectDatabase("mongodb://127.0.0.1/test").then(() => { ready = true; });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(init.mock.callCount(), 1);
  assert.equal(ready, false);
  release();
  await connection;
  assert.equal(ready, true);
  init.mock.mockImplementation(async () => { throw new Error("Index initialization failed"); });
  await assert.rejects(connectDatabase("mongodb://127.0.0.1/test"), /Index initialization failed/);
});
