import mongoose from "mongoose";
import { User } from "../models/User";

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  await User.init();
}
