import { randomBytes } from "node:crypto";

export function newCancelToken(): string {
  return randomBytes(24).toString("base64url");
}

export function isCancelToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,128}$/.test(token);
}
