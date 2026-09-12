import { getRequestEvent } from "@solidjs/web";

import { checkSession } from "#/session";

declare module "@solidjs/web" {
  interface RequestEventLocals {
    isValidSession: boolean;
  }
}

function attachSessionValid(request: Request, next: () => Promise<Response>) {
  getRequestEvent()!.locals.isValidSession = checkSession(request);
  return next();
}

export default [attachSessionValid];
