import { User } from "../models/User";
import type { RegisterBody } from "../types/index";
import { HttpError } from "../middleware/errors";
import { passwordField, stringField } from "../middleware/validation";

export async function setupAdmin(values: RegisterBody): Promise<boolean> {
  if ((await User.countDocuments({ role: "security_admin" })) > 1)
    throw new HttpError(
      409,
      "Multiple administrator records exist. Resolve them before setup.",
    );
  await User.init();
  if (await User.exists({ role: "security_admin" })) return false;
  const email = stringField(values.email, "email").trim().toLowerCase();
  if (await User.exists({ email }))
    throw new HttpError(
      409,
      "That email is already registered; no account was promoted",
    );
  try {
    await User.create({
      name: stringField(values.name, "name"),
      email,
      password: passwordField(values.password),
      role: "security_admin",
      isActive: true,
    });
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000 &&
      (await User.exists({ role: "security_admin" }))
    )
      return false;
    throw error;
  }
}
