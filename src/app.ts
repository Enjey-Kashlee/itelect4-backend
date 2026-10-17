import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { readConfig, type AppConfig } from "./config/env";
import { connectDatabase } from "./config/db";
import { createAuthRouter } from "./routes/auth";
import { createClaimsRouter } from "./routes/claims";
import { createItemsRouter } from "./routes/items";
import { handleError, HttpError } from "./middleware/errors";

export function createApp(
  config: Pick<AppConfig, "mongoUri" | "jwtSecret" | "corsOrigins">,
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin))
          callback(null, true);
        else callback(new HttpError(403, "Origin is not allowed"));
      },
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use(async (_req, _res, next) => {
    await connectDatabase(config.mongoUri);
    next();
  });
  app.get("/api/health", (_req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({ ok: connected, db: connected });
  });
  app.use("/api/auth", createAuthRouter(config.jwtSecret));
  app.use("/api/claims", createClaimsRouter(config.jwtSecret));
  app.use("/api/items", createItemsRouter());
  app.use((_req, res) => {
    res.status(404).json({ message: "No route with that path and method" });
  });
  app.use(handleError);
  return app;
}

export default createApp(readConfig(process.env));
