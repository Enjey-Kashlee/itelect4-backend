import { Types } from "mongoose";

export function publicJson(_document: unknown, result: Record<string, unknown>) {
  result.id = String(result._id);
  delete result._id;
  delete result.__v;
  delete result.password;
  for (const key of Object.keys(result)) {
    if (result[key] instanceof Types.ObjectId) result[key] = String(result[key]);
  }
  return result;
}
