import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
  } else if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ message: "Validation failed", errors: Object.values(error.errors).map((field) => field.message) });
  } else if (error instanceof mongoose.Error.CastError) {
    res.status(400).json({ message: `Invalid ${error.path}` });
  } else if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
    res.status(409).json({ message: "That email is already registered" });
  } else if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed") {
    res.status(400).json({ message: "Request body must contain valid JSON" });
  } else if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.too.large") {
    res.status(413).json({ message: "Request body is too large" });
  } else {
    // Avoid logging request bodies, tokens, or database connection strings.
    console.error("Request failed:", error instanceof Error ? error.name : "Unknown error");
    res.status(500).json({ message: "An unexpected server error occurred" });
  }
};
