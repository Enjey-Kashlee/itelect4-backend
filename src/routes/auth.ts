import { Router, type Request } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import type { LoginBody, RegisterBody } from "../types/index";
import { HttpError } from "../middleware/errors";
import { jsonBody, onlyFields, passwordField, stringField } from "../middleware/validation";

export function createAuthRouter(jwtSecret: string): Router {
  const router = Router();
  router.post("/register", async (req: Request<unknown, unknown, RegisterBody>, res) => {
    const body = jsonBody(req.body);
    onlyFields(body, ["name", "email", "password"]);
    const user = await User.create({
      name: stringField(body.name, "name"),
      email: stringField(body.email, "email"),
      password: passwordField(body.password),
      role: "student",
    });
    res.status(201).json(user);
  });

  router.post("/login", async (req: Request<unknown, unknown, LoginBody>, res) => {
    const body = jsonBody(req.body);
    onlyFields(body, ["email", "password"]);
    const email = stringField(body.email, "email").trim().toLowerCase();
    const password = passwordField(body.password);
    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) {
      throw new HttpError(401, "Email or password is incorrect");
    }
    const token = jwt.sign({ userId: String(user._id) }, jwtSecret, { algorithm: "HS256", expiresIn: "2h" });
    res.json({ token, user: user.toJSON() });
  });
  return router;
}
