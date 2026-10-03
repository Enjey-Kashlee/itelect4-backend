import { model, Schema } from "mongoose";
import type { ClaimDoc } from "../types/index";

const claimSchema = new Schema<ClaimDoc>({
  itemId: {
    type: Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  claimantId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  claimedAt: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },
});

export const Claim = model<ClaimDoc>("Claim", claimSchema);
