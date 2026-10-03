import { randomBytes } from "node:crypto";
import { Item } from "../models/Item";
import { User } from "../models/User";

const sampleItems = [
  { _id: "65f000000000000000000001", title: "Blue Water Bottle", description: "Hydro Flask with a campus sticker.", status: "found", location: "Library, second floor" },
  { _id: "65f000000000000000000002", title: "Black Umbrella", description: "A folding umbrella with a red wrist strap.", status: "found", location: "Student lounge" },
  { _id: "65f000000000000000000003", title: "Silver Keychain", description: "Two keys on a small silver ring.", status: "lost", location: "Near the main gate" },
];

export async function seedSampleItems(): Promise<void> {
  let reporter = await User.findOne({ email: "sample-reporter@example.invalid" });
  if (!reporter) {
    reporter = await User.create({ name: "Sample Reporter", email: "sample-reporter@example.invalid",
      password: randomBytes(24).toString("hex"), role: "student" });
  }
  for (const item of sampleItems) {
    // Re-running the command preserves any sample item that was already edited.
    await Item.updateOne({ _id: item._id }, { $setOnInsert: { ...item, reportedById: reporter._id } },
      { upsert: true, runValidators: true });
  }
}
