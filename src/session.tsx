import { createHmac, timingSafeEqual } from "node:crypto";

import { getRequestEvent, parseCookieHeader, redirect, serializeCookie } from "@solidjs/web";
import { isValid, isPast, addSeconds, subSeconds } from "date-fns";

import { paths } from "#/navigation";

const COOKIE_NAME = "kbf-session";

const VALID_SECONDS = 60 * 30; // 60 seconds in a minute, 30 min
const REFRESH_BEFORE_SECONDS = VALID_SECONDS / 2;
const MAX_AGE_SECONDS = VALID_SECONDS + 60;

const { SESSION_SECRET, ADMIN_PASSWORD } = process.env;
if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  throw new Error("Missing important authentication secrets");
}
const ADMIN_PASSWORD_BUFFER = Buffer.from(ADMIN_PASSWORD);

function compareTimingSafe(a: Buffer<ArrayBuffer>, b: Buffer<ArrayBuffer>): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

function writeCookie(value: string, maxAge: number) {
  getRequestEvent()!.response.headers.append(
    "set-cookie",
    serializeCookie(COOKIE_NAME, value, {
      path: "/",
      sameSite: "Strict",
      httpOnly: true,
      secure: import.meta.env.PROD,
      maxAge,
    }),
  );
}

function hmacDigest(data: string): string {
  return createHmac("sha256", SESSION_SECRET!).update(data).digest("base64url");
}

function commitNewAuthDate() {
  const validUntil = addSeconds(new Date(), VALID_SECONDS).toISOString();
  return writeCookie(`${validUntil}.${hmacDigest(validUntil)}`, MAX_AGE_SECONDS);
}

function getCookiesValidUntilDate(request: Request) {
  const rawHeader = request.headers.get("cookie");

  const parsedCookie = parseCookieHeader(rawHeader)[COOKIE_NAME];
  if (!parsedCookie) {
    return null;
  }

  const dotIndex = parsedCookie.lastIndexOf(".");
  const validUntil = parsedCookie.slice(0, dotIndex);
  const actualDigest = parsedCookie.slice(dotIndex + 1);
  if (!validUntil || !actualDigest) {
    return null;
  }

  const untilDate = new Date(validUntil);
  if (!isValid(untilDate)) {
    return null;
  }

  const expectedDigest = Buffer.from(hmacDigest(validUntil));
  return compareTimingSafe(expectedDigest, Buffer.from(actualDigest)) ? untilDate : null;
}

export function destroy() {
  writeCookie("", -1);
}

export function create({ username, password }: { username: unknown; password: unknown }): boolean {
  if (username !== "admin" || typeof password !== "string") {
    return false;
  }

  const valid = compareTimingSafe(Buffer.from(password), ADMIN_PASSWORD_BUFFER);
  if (valid) {
    commitNewAuthDate();
  }
  return valid;
}

export function checkSession(request: Request): boolean {
  const validUntilDate = getCookiesValidUntilDate(request);
  if (!validUntilDate || isPast(validUntilDate)) {
    return false;
  }
  if (isPast(subSeconds(validUntilDate, REFRESH_BEFORE_SECONDS))) {
    commitNewAuthDate();
  }
  return true;
}

export function requireUser(): void {
  if (!getRequestEvent()?.locals.isValidSession) {
    throw redirect(paths.login.toString(), 302);
  }
}
