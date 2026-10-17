import mongoose from "mongoose";
import { User } from "../models/User";

let connecting: Promise<void> | undefined;

export async function connectDatabase(uri: string): Promise<void> {
  if (connecting) return connecting;
  if (mongoose.connection.readyState === 1) {
    await User.init();
    return;
  }
  connecting = mongoose
    .connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
      await User.init();
    })
    .finally(() => {
      connecting = undefined;
    });
  return connecting;
}
