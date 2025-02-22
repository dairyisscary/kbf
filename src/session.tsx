"use server";
import { useSession } from "vinxi/http";
import { redirect } from "@solidjs/router";
import { isValid, isPast, addSeconds } from "date-fns";

type SessionData = { validUntil?: string };
type Session = Awaited<ReturnType<typeof getSession>>;

const VALID_SECONDS = 60 * 30; // 60 seconds in a minute, 30 min
const REFRESH_BEFORE_SECONDS = VALID_SECONDS / 2;
const MAX_AGE_SECONDS = VALID_SECONDS + 60;
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
      maxAge: MAX_AGE_SECONDS,
    },
  });
}

function writeSessionDate(session: Session, validUntil: string | undefined) {
  return session.update(() => ({ validUntil }));
}

function commitNewAuthDate(session: Session) {
  return writeSessionDate(session, addSeconds(new Date(), VALID_SECONDS).toISOString());
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
  if (!validUntilDate || isPast(validUntilDate)) {
    throw redirect("/login");
  }
  if (isPast(addSeconds(validUntilDate, -REFRESH_BEFORE_SECONDS))) {
    await commitNewAuthDate(await getSession());
  }
}
