"use server";
import { useSession } from "vinxi/http";
import { redirect } from "@solidjs/router";
import { isValid, isFuture, addHours } from "date-fns";

type SessionData = { validUntil?: string };
type Session = Awaited<ReturnType<typeof getSession>>;

const VALID_HOURS = 2;
const { SESSION_SECRET, ADMIN_PASSWORD } = process.env;
if (!ADMIN_PASSWORD || !SESSION_SECRET) {
  throw new Error("Missing important authentication secrets");
}

function getSession() {
  return useSession<SessionData>({
    password: SESSION_SECRET!,
    cookie: {
      sameSite: "strict",
      secure: import.meta.env.PROD,
      httpOnly: true,
      maxAge: 60 * 60 * VALID_HOURS,
    },
  });
}

function writeSessionDate(session: Session, validUntil: string | undefined) {
  return session.update(() => ({ validUntil }));
}

function commitNewAuthDate(session: Session) {
  return writeSessionDate(session, addHours(new Date(), VALID_HOURS).toISOString());
}

function getCookiesValidUntilDate(session: Session) {
  const rawValidUntil = session.data.validUntil;
  const validUntilDate = rawValidUntil && new Date(rawValidUntil);
  return validUntilDate && isValid(validUntilDate) ? validUntilDate : null;
}

export async function logout() {
  await writeSessionDate(await getSession(), undefined);
}

export async function login(options: {
  username: string | null;
  password: string | null;
}): Promise<boolean> {
  const valid = Boolean(
    options.username === "admin" && ADMIN_PASSWORD && options.password === ADMIN_PASSWORD,
  );
  if (valid) {
    await commitNewAuthDate(await getSession());
  }
  return valid;
}

export async function checkSession() {
  const validUntilDate = getCookiesValidUntilDate(await getSession());
  if (!validUntilDate || !isFuture(validUntilDate)) {
    throw redirect("/login");
  }
}

export async function refreshToken() {
  const session = await getSession();
  const validUntilDate = getCookiesValidUntilDate(session);
  if (!validUntilDate) {
    return null;
  }
  const refreshTime = addHours(validUntilDate, VALID_HOURS / -2);
  return isFuture(refreshTime) ? null : commitNewAuthDate(session);
}
