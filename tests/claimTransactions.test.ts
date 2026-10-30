import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { claimTransaction } from "../src/data/claimTransactions";
import { HttpError } from "../src/middleware/errors";

test("unsupported transactions fail closed with deployment guidance", async (t) => {
  t.mock.method(mongoose.connection, "transaction", async () => {
    throw Object.assign(new Error("Transactions unavailable"), { code: 20 });
  });
  await assert.rejects(
    claimTransaction(async () => "unused"),
    (error: unknown) =>
      error instanceof HttpError &&
      error.status === 503 &&
      error.message.includes("replica set"),
  );
});

test("other transaction failures are preserved for the generic error handler", async (t) => {
  const failure = new Error("Database failure");
  t.mock.method(mongoose.connection, "transaction", async () => {
    throw failure;
  });
  await assert.rejects(
    claimTransaction(async () => "unused"),
    (error: unknown) => error === failure,
  );
});
