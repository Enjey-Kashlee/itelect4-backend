import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "./config/db";
import { readConfig } from "./config/env";

async function start(): Promise<void> {
  const config = readConfig(process.env);
  await connectDatabase(config.mongoUri);
  // Load the hosting entry only after configuration passes the startup error handler.
  const { default: app } = require("./app") as typeof import("./app");
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`MongoDB connected; API listening on port ${config.port}`);
  });
  server.on("error", () => {
    console.error(
      "Could not start the HTTP server. Check PORT and whether another process uses it.",
    );
    void mongoose.disconnect().finally(() => {
      process.exitCode = 1;
    });
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      server.close(() => {
        void mongoose.disconnect();
      });
    });
  }
}

start().catch(async (error: unknown) => {
  console.error(
    error instanceof Error &&
      /^(MONGODB_URI|JWT_SECRET|PORT|CORS_ORIGIN)\b/.test(error.message)
      ? error.message
      : "Startup failed. Check database credentials, Atlas network access, and connectivity.",
  );
  await mongoose.disconnect();
  process.exitCode = 1;
});
