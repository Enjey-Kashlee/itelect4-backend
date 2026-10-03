import { HttpError } from "./errors";

export function jsonBody(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Send a JSON object with Content-Type: application/json");
  }
  return value as Record<string, unknown>;
}

export function onlyFields(body: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new HttpError(400, "Request contains an unsupported field");
}

export function stringField(value: unknown, name: string): string {
  if (typeof value !== "string") throw new HttpError(400, `${name} must be a string`);
  return value;
}

export function objectId(value: unknown, name: string): string {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) throw new HttpError(400, `${name} must be a valid ObjectId`);
  return value;
}

export function passwordField(value: unknown): string {
  const password = stringField(value, "password");
  if (Buffer.byteLength(password, "utf8") > 72) throw new HttpError(400, "password must be at most 72 UTF-8 bytes");
  return password;
}
