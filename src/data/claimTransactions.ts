import mongoose, { type ClientSession } from "mongoose";
import { Item } from "../models/Item";
import { HttpError } from "../middleware/errors";
import { objectId } from "../middleware/validation";

export async function claimTransaction<T>(
  work: (session: ClientSession) => Promise<T>,
): Promise<T> {
  try {
    return await mongoose.connection.transaction(work, {
      readPreference: "primary",
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 20
    ) {
      throw new HttpError(
        503,
        "Claim updates require a MongoDB replica set or sharded cluster.",
      );
    }
    throw error;
  }
}

export async function lockClaimableItem(
  value: unknown,
  session: ClientSession,
): Promise<string> {
  const id = objectId(value, "itemId");
  // A real write serializes claim submission/reassignment with item approval.
  const item = await Item.findOneAndUpdate(
    { _id: id, status: "lost" },
    { $inc: { __v: 1 } },
    { session },
  );
  if (!item) {
    if (!(await Item.exists({ _id: id }).session(session)))
      throw new HttpError(404, "No item with that id");
    throw new HttpError(409, "Found items can no longer be claimed.");
  }
  return id;
}
