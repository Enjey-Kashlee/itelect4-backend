import { model, Schema } from "mongoose";
import type { ItemDoc } from "../types/index";
import { publicJson } from "./json";

const itemSchema = new Schema<ItemDoc>({
  title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  status: { type: String, required: true, enum: ["lost", "found"] },
  location: { type: String, required: true, trim: true, maxlength: 200 },
  reportedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
});
itemSchema.set("toJSON", { transform: publicJson });

export const Item = model<ItemDoc>("Item", itemSchema);
