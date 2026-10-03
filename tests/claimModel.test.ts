import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";

test("a new claim starts pending and serializes string IDs", async () => {
  const { Claim } = await import("../src/models/Claim");
  const claimantId = new Types.ObjectId();
  const itemId = new Types.ObjectId();
  const claim = new Claim({
    itemId,
    claimantId,
    proofDescription: "  My initials are engraved on the underside.  ",
  });

  await claim.validate();

  assert.equal(String(claim.itemId), String(itemId));
  assert.equal(String(claim.claimantId), String(claimantId));
  const json = claim.toJSON() as Record<string, unknown>;
  assert.equal(json.status, "pending");
  assert.equal(json.proofDescription, "My initials are engraved on the underside.");
  assert.equal(json.itemId, String(itemId));
  assert.equal(json.claimantId, String(claimantId));
  assert.equal(json.id, String(claim._id));
  assert.equal("_id" in json, false);
  assert.equal("__v" in json, false);
  assert.ok(claim.claimedAt instanceof Date);
});

test("a claim rejects missing or invalid ownership and item IDs", async () => {
  const { Claim } = await import("../src/models/Claim");
  const claimantId = new Types.ObjectId();
  const itemId = new Types.ObjectId();
  const proofDescription = "My initials are engraved on the underside.";

  await assert.rejects(new Claim({ itemId, proofDescription }).validate(), /claimantId/);
  await assert.rejects(new Claim({ claimantId, proofDescription }).validate(), /itemId/);
  await assert.rejects(new Claim({ claimantId, itemId: 101, proofDescription }).validate(), /itemId/);
  await assert.rejects(new Claim({ claimantId, itemId: "not-an-object-id", proofDescription }).validate(), /itemId/);
});

test("claims require proof of 10–1000 characters and a supported status", async () => {
  const { Claim } = await import("../src/models/Claim");
  const ids = { itemId: new Types.ObjectId(), claimantId: new Types.ObjectId() };

  await assert.rejects(new Claim(ids).validate(), /proofDescription/);
  await assert.rejects(new Claim({ ...ids, proofDescription: "   short   " }).validate(), /proofDescription/);
  await assert.rejects(new Claim({ ...ids, proofDescription: "x".repeat(1001) }).validate(), /proofDescription/);
  await assert.rejects(new Claim({ ...ids, proofDescription: "x".repeat(10), status: "unknown" }).validate(), /status/);
  await new Claim({ ...ids, proofDescription: "x".repeat(10) }).validate();
  await new Claim({ ...ids, proofDescription: "x".repeat(1000), status: "approved" }).validate();
});
