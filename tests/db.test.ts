import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { User } from "../src/models/User";
import { connectDatabase } from "../src/config/db";

test("database readiness waits for the unique email index and propagates index failures", async (t) => {
  const connect = t.mock.method(mongoose, "connect", async () => mongoose);
  let release!: () => void;
  let ready = false;
  const index = new Promise<void>((resolve) => {
    release = resolve;
  });
  const init = t.mock.method(User, "init", async () => {
    await index;
    return User;
  });
  const connection = connectDatabase("mongodb://127.0.0.1/test").then(() => {
    ready = true;
  });
  const concurrent = connectDatabase("mongodb://127.0.0.1/test");
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(init.mock.callCount(), 1);
  assert.equal(connect.mock.callCount(), 1);
  assert.equal(ready, false);
  release();
  await connection;
  await concurrent;
  assert.equal(ready, true);
  init.mock.mockImplementation(async () => {
    throw new Error("Index initialization failed");
  });
  await assert.rejects(
    connectDatabase("mongodb://127.0.0.1/test"),
    /Index initialization failed/,
  );
  init.mock.mockImplementation(async () => User);
  connect.mock.mockImplementationOnce(async () => {
    throw new Error("Connection failed");
  });
  await assert.rejects(
    connectDatabase("mongodb://127.0.0.1/test"),
    /Connection failed/,
  );
  await connectDatabase("mongodb://127.0.0.1/test");
});
