import { action, defineRoute, query, useSubmissions } from "@solidjs/router";
import { getRequestEvent, redirect, respond } from "@solidjs/web";
import { createMemo, Show } from "solid-js";

import { Alert } from "#/alert";
import { Button } from "#/button";
import { FormFooter, FormRowWithId, Label } from "#/form";
import { KbfSiteTitle } from "#/meta";
import { create } from "#/session";

const isUnauthQuery = query(async () => {
  "use server";
  if (getRequestEvent()?.locals.isValidSession) {
    throw redirect("/");
  }
  return true;
}, "isUnauth");

const loginAction = action(async (formData: FormData) => {
  "use server";
  const success = create({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (success) {
    throw redirect("/");
  }
  throw respond({ message: "That username and password pair is not correct." }, { status: 400 });
});

export const route = defineRoute({
  preload() {
    void isUnauthQuery();
  },
});

export default function Login() {
  const isUnauthed = createMemo(() => isUnauthQuery());
  const submissions = useSubmissions(loginAction);
  return (
    <Show when={isUnauthed()}>
      <div class="mx-auto w-[min(600px,100%)]">
        <KbfSiteTitle>Login</KbfSiteTitle>
        <h1>Login</h1>
        <form method="post" action={loginAction}>
          <Show when={submissions.at(-1)?.error?.message}>
            {(message) => <Alert class="mt-8">{message()}</Alert>}
          </Show>
          <FormRowWithId>
            {(id) => (
              <>
                <Label for={id}>Username</Label>
                <input autofocus id={id} type="text" name="username" required />
              </>
            )}
          </FormRowWithId>

          <FormRowWithId>
            {(id) => (
              <>
                <Label for={id}>Password</Label>
                <input id={id} type="password" name="password" required />
              </>
            )}
          </FormRowWithId>

          <FormFooter>
            <Button type="submit">Login</Button>
          </FormFooter>
        </form>
      </div>
    </Show>
  );
}
