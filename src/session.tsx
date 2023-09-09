import { createCookieSessionStorage } from "solid-start";
import { isValid, isFuture, addHours } from "date-fns";

type Session = Awaited<ReturnType<(typeof STORAGE)["getSession"]>>;

const VALID_HOURS = 24;
const { ADMIN_PASSWORD, SESSION_SECRET } = process.env;
if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  throw new Error("Missing important authentication secrets");
}
const STORAGE = createCookieSessionStorage({
  cookie: {
    name: "kbf-session",
    secure: process.env.NODE_ENV === "production",
    secrets: [SESSION_SECRET],
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * VALID_HOURS, // 1 day
    httpOnly: true,
  },
});

function commitNewAuthDate(session: Session) {
  const newAuthDate = addHours(new Date(), VALID_HOURS).toISOString();
  session.set("validUntil", newAuthDate);
  return STORAGE.commitSession(session);
}

function getCookiesValidUntilDate(session: Session) {
  const rawValidUntil = session.get("validUntil") as string | null;
  const validUntilDate = rawValidUntil && new Date(rawValidUntil);
  return validUntilDate && isValid(validUntilDate) ? validUntilDate : null;
}

export async function logout(requestCookie: string | null) {
  return STORAGE.destroySession(await STORAGE.getSession(requestCookie));
}

export async function login(inputs: Record<string, unknown>, requestCookie: string | null) {
  const valid = inputs.username === "admin" && ADMIN_PASSWORD && inputs.password === ADMIN_PASSWORD;
  return valid ? commitNewAuthDate(await STORAGE.getSession(requestCookie)) : null;
}

export async function isValidSession(requestCookie: string | null) {
  const validUntilDate = getCookiesValidUntilDate(await STORAGE.getSession(requestCookie));
  return Boolean(validUntilDate && isFuture(validUntilDate));
}

export async function refreshToken(requestCookie: string | null) {
  const session = await STORAGE.getSession(requestCookie);
  const validUntilDate = getCookiesValidUntilDate(session);
  if (!validUntilDate) {
    return null;
  }
  const refreshTime = addHours(validUntilDate, VALID_HOURS / -2);
  return isFuture(refreshTime) ? null : commitNewAuthDate(session);
}
