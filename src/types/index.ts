import type { Types } from "mongoose";

// API IDs are strings; MongoDB stores references as ObjectId objects.
export type ID = string;
export type ClaimStatus = "pending" | "approved" | "rejected";

export interface User {
  id: ID;
  name: string;
  email: string;
  role: "student" | "security_admin";
  isActive: boolean;
}

export interface Item {
  id: ID;
  title: string;
  description: string;
  status: "lost" | "found";
  location: string;
  reportedById: ID;
  reportedBy?: Pick<User, "id" | "name"> | null;
}

export interface Claim {
  id: ID;
  itemId: ID;
  claimantId: ID;
  claimedAt: Date;
  proofDescription: string;
  status: ClaimStatus;
  item?: Pick<Item, "id" | "title" | "location"> | null;
  reviewedById?: ID;
  reviewedAt?: Date;
}

export type UserDoc = Omit<User, "id"> & { password: string };
export type ItemDoc = Omit<Item, "id" | "reportedById" | "reportedBy"> & {
  reportedById: Types.ObjectId;
};
export type ClaimDoc = Omit<
  Claim,
  "id" | "claimantId" | "itemId" | "item" | "reviewedById"
> & {
  itemId: Types.ObjectId;
  reviewedById?: Types.ObjectId;
  claimantId: Types.ObjectId;
};

// Ownership, status and date come from the server, not the request body.
export type NewClaimBody = Pick<Claim, "itemId" | "proofDescription">;
export type UpdateClaimBody = Partial<NewClaimBody>;
export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}
export interface LoginBody {
  email: string;
  password: string;
}
