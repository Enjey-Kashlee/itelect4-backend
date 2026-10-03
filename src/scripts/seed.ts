import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/db";
import { readConfig } from "../config/env";
import { seedSampleItems } from "../data/seedItems";

async function seed(): Promise<void> {
  const config = readConfig(process.env);
  await connectDatabase(config.mongoUri);
  await seedSampleItems();
  console.log("Sample items are ready. Existing items and claims were preserved.");
}

seed().catch(() => {
  console.error("Seeding failed. Check environment settings and database connectivity.");
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
