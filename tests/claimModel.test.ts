import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";

test("a new claim records its claimant and starts unverified", async () => {
  const { Claim } = await import("../src/models/Claim");
  const claimantId = new Types.ObjectId();
  const itemId = new Types.ObjectId();
  const claim = new Claim({ itemId, claimantId });

  await claim.validate();

  assert.equal(String(claim.itemId), String(itemId));
  assert.equal(String(claim.claimantId), String(claimantId));
  assert.equal(claim.verified, false);
  assert.ok(claim.claimedAt instanceof Date);
});

test("a claim rejects missing or invalid ownership and item IDs", async () => {
  const { Claim } = await import("../src/models/Claim");
  const claimantId = new Types.ObjectId();
  const itemId = new Types.ObjectId();

  await assert.rejects(new Claim({ itemId }).validate(), /claimantId/);
  await assert.rejects(new Claim({ claimantId }).validate(), /itemId/);
  await assert.rejects(new Claim({ claimantId, itemId: 101 }).validate(), /itemId/);
  await assert.rejects(new Claim({ claimantId, itemId: "not-an-object-id" }).validate(), /itemId/);
});
