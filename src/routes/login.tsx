import { Show } from "solid-js";
import { createRouteAction, redirect, useSearchParams } from "solid-start";

import { pealFormData, FormFooter, FormRowWithId, Label } from "~/form";
import Button from "~/button";
import Alert from "~/alert";

export default function Login() {
  const [searchParams] = useSearchParams();
  const [submitting, submit] = createRouteAction(async (form: FormData) => {
    const pealed = pealFormData(form);
    return fetch("/api/login", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pealed),
    })
      .then((r) => r.json() as Promise<{ success: boolean; error?: string }>)
      .then(({ success, error }) => {
        if (success) {
          const to = (pealed.redirectTo as string | null) || "/";
          return redirect(to);
        }
        throw new Error(error || "Something went wrong");
      })
      .catch((error: unknown) => (error as Error).message);
  });
  return (
    <div class="mx-auto w-[min(600px,100%)]">
      <h1>Login</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(new FormData(event.target as HTMLFormElement)).catch(() => {});
        }}
      >
        <Show when={typeof submitting.result === "string"}>
          <Alert class="mt-8">{submitting.result as string}</Alert>
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
