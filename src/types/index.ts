import type { Types } from "mongoose";

export interface User {
  id: number | string;
  name: string;
  email: string;
  role: "student" | "security_admin"; // only these values
  isActive: boolean;
}
// An Item is a lost/found post reported by a user.
export interface Item {
  id: ID; // number for lost/found reports, string for reused codes (e.g. a course code standing in as an item id)
  title: string;
  description: string;
  status: "lost" | "found";
  location: string;
  reportedById: number | string;
}
// A Claim is filed when a user claims an item; a security admin verifies it.
export interface Claim {
  id: ID;
  itemId: number;
  claimantId: number | string;
  claimedAt: Date;
  verified?: boolean; // ? means this field is optional -- set once an admin verifies
}

export type ID = number | string;

export type UserDoc = Omit<User, "id"> & {
  password: string;
};

export type ClaimDoc = Omit<Claim, "id" | "claimantId" | "itemId"> & {
  itemId: Types.ObjectId;
  claimantId: Types.ObjectId;
};

export type NewCLaimBody = Pick<Claim, "itemId">
