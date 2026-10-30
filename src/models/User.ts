import bcrypt from "bcryptjs";
import { model, Schema } from "mongoose";
import type { UserDoc } from "../types/index";
import { publicJson } from "./json";

const userSchema = new Schema<UserDoc>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address"],
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ["student", "security_admin"],
    default: "student",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: "security_admin" },
    name: "single_security_admin",
  },
);

userSchema.pre("save", async function () {
  if (this.isModified("password"))
    this.password = await bcrypt.hash(this.password, 12);
});
userSchema.set("toJSON", { transform: publicJson });

export const User = model<UserDoc>("User", userSchema);
