import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app";
import { connectDatabase } from "../../src/config/db";
import { reviewClaim } from "../../src/ai/gemini";
import { User } from "../../src/models/User";

const { select } = vi.hoisted(() => ({ select: vi.fn() }));

vi.mock("../../src/config/db", () => ({ connectDatabase: vi.fn() }));
vi.mock("../../src/models/User", () => ({
  User: { findById: vi.fn(() => ({ select })) },
}));
vi.mock("../../src/ai/gemini", () => ({
  reviewClaim: vi.fn(() => {
    throw new Error("GT6 must not call Gemini");
  }),
}));

const secret = process.env.JWT_SECRET!;
const userId = "65f000000000000000000001";
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  select.mockResolvedValue({ isActive: true });
  app = createApp({
    mongoUri: process.env.MONGODB_URI!,
    jwtSecret: secret,
    corsOrigins: ["http://localhost:5173"],
  });
});

afterEach(() => {
  expect(connectDatabase).toHaveBeenCalledWith(
    "mongodb://127.0.0.1:1/gt6_unused",
  );
  expect(reviewClaim).not.toHaveBeenCalled();
});

describe("POST /api/ai authentication", () => {
  it("returns 401 with no token", async () => {
    const response = await request(app)
      .post("/api/ai")
      .send({ prompt: "short" });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Send Authorization: Bearer <token>",
    });
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("returns 401 with an invalid token", async () => {
    const response = await request(app)
      .post("/api/ai")
      .auth("invalid-token", { type: "bearer" })
      .send({ prompt: "short" });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Token is invalid or has expired",
    });
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("lets a valid token reach prompt validation without calling Gemini", async () => {
    const token = jwt.sign({ userId }, secret, { expiresIn: "1h" });
    const response = await request(app)
      .post("/api/ai")
      .auth(token, { type: "bearer" })
      .send({ prompt: "short" });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message:
        "Describe your item and ownership evidence in at least 20 characters.",
    });
    expect(User.findById).toHaveBeenCalledWith(userId);
    expect(select).toHaveBeenCalledWith("isActive");
  });

  it("returns 401 when a signed token belongs to an inactive account", async () => {
    select.mockResolvedValue({ isActive: false });
    const token = jwt.sign({ userId }, secret, { expiresIn: "1h" });
    const response = await request(app)
      .post("/api/ai")
      .auth(token, { type: "bearer" })
      .send({ prompt: "short" });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Account is unavailable" });
  });
});
