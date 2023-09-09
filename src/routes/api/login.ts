import { json, type APIEvent } from "solid-start/api";

import { login } from "~/session";

export async function POST(event: APIEvent) {
  const body = (await new Response(event.request.body).json()) as {
    username: string;
    password: string;
  };
  const cookieHeader = await login(
    { username: body.username, password: body.password },
    event.request.headers.get("Cookie"),
  );
  if (cookieHeader) {
    return json({ success: true }, { headers: { "Set-Cookie": cookieHeader } });
  }
  return json({ success: false, error: "That username and/or password appears to be wrong." });
}
