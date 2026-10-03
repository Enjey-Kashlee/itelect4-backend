export interface AppConfig {
  mongoUri: string;
  jwtSecret: string;
  port: number;
  corsOrigins: string[];
}

export function readConfig(env: NodeJS.ProcessEnv): AppConfig {
  const mongoUri = env.MONGODB_URI?.trim() ?? "";
  const jwtSecret = env.JWT_SECRET ?? "";
  const portText = env.PORT ?? "4000";
  if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) throw new Error("MONGODB_URI must be a MongoDB connection string");
  if (jwtSecret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
  if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) {
    throw new Error("PORT must be a whole number between 1 and 65535");
  }
  const corsOrigins = (env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((value) => value.trim()).filter(Boolean);
  if (!corsOrigins.length) throw new Error("CORS_ORIGIN must contain an allowed frontend origin");
  return { mongoUri, jwtSecret, port: Number(portText), corsOrigins };
}
