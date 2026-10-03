import { model, Schema } from "mongoose";
import type { ClaimDoc } from "../types/index";
import { publicJson } from "./json";

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
  proofDescription: {
    type: String,
    trim: true,
    required: [true, "proofDescription is required"],
    minlength: [10, "Describe your proof in at least 10 characters"],
    maxlength: [1000, "Proof must be at most 1000 characters"],
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    required: true,
  },
});

claimSchema.set("toJSON", { transform: publicJson });

export const Claim = model<ClaimDoc>("Claim", claimSchema);
