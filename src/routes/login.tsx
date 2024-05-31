import { Show } from "solid-js";
import { useSearchParams, action, redirect, useSubmission } from "@solidjs/router";

import { login } from "~/session";
import { FormFooter, FormRowWithId, Label } from "~/form";
import Button from "~/button";
import Alert from "~/alert";

const loginAction = action(async (formData: FormData) => {
  const success = await login({
    username: formData.get("username") as string | null,
    password: formData.get("password") as string | null,
  });
  if (success) {
    throw redirect((formData.get("redirectTo") as string) || "/");
  }
  return new Error("That username and password pair is not correct.");
}, "login");

export default function Login() {
  const [searchParams] = useSearchParams();
  const loggingIn = useSubmission(loginAction);
  return (
    <div class="mx-auto w-[min(600px,100%)]">
      <h1>Login</h1>
      <form method="post" action={loginAction}>
        <Show when={loggingIn.result}>
          {(result) => <Alert class="mt-8">{result().message}</Alert>}
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

        <input type="hidden" name="redirectTo" value={searchParams.redirectTo || ""} />

        <FormFooter>
          <Button type="submit">Login</Button>
        </FormFooter>
      </form>
    </div>
  );
}
