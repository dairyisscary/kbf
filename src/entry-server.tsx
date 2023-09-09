import { redirect, type FetchEvent } from "solid-start";
import {
  createHandler,
  renderAsync,
  StartServer,
  type MiddlewareInput,
} from "solid-start/entry-server";

import { isValidSession, refreshToken } from "~/session";

function protection({ forward }: MiddlewareInput): (event: FetchEvent) => Promise<Response> {
  return async (event) => {
    const { request } = event;
    const cookie = request.headers.get("Cookie");
    const isValid = await isValidSession(cookie);

    const { searchParams, pathname } = new URL(request.url);
    switch (pathname) {
      case "/login":
        return isValid ? redirect(searchParams.get("redirectTo") || "/") : forward(event);
      case "/api/login":
        // always allow this url
        return forward(event);
    }

    if (isValid) {
      const [response, newCookie] = await Promise.all([forward(event), refreshToken(cookie)]);
      if (newCookie) {
        response.headers.set("Set-Cookie", newCookie);
      }
      return response;
    }

    const loginSearchParams = new URLSearchParams({
      redirectTo: `${pathname}?${searchParams.toString()}`,
    });
    return redirect(`/login?${loginSearchParams.toString()}`);
  };
}

export default createHandler(
  protection,
  renderAsync((event) => <StartServer event={event} />),
);
