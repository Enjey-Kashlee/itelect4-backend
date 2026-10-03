import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { HttpError } from "./errors";

declare global {
  namespace Express {
    interface Request { userId?: string }
  }
}

export function requireAuth(secret: string): RequestHandler {
  return async (req, _res, next) => {
    const token = /^Bearer ([^\s]+)$/i.exec(req.header("Authorization") ?? "")?.[1];
    if (!token) throw new HttpError(401, "Send Authorization: Bearer <token>");
    let userId: string;
    try {
      const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
      if (typeof payload === "string" || typeof payload.userId !== "string" ||
        !/^[a-f\d]{24}$/i.test(payload.userId) || typeof payload.exp !== "number") throw new Error("Invalid payload");
      userId = payload.userId;
    } catch {
      throw new HttpError(401, "Token is invalid or has expired");
    }
    const user = await User.findById(userId).select("isActive");
    if (!user?.isActive) throw new HttpError(401, "Account is unavailable");
    req.userId = userId;
    next();
  };
}
