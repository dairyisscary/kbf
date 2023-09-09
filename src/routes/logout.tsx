import { createServerData$, redirect } from "solid-start/server";

import { logout } from "~/session";

export function routeData() {
  return createServerData$(async (_key, event) => {
    const newCookie = await logout(event.request.headers.get("Cookie"));
    return redirect("/login", { headers: { "Set-Cookie": newCookie } });
  });
}

export default function Logout() {
  return null;
}
