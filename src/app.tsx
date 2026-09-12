import { useMatch } from "@solidjs/router";
import type { JSX } from "@solidjs/web";
import { Loading, Errored, Show } from "solid-js";

import "#/app.css"; // oxlint-disable-line import/no-unassigned-import
import { HttpErrorPage } from "#/error";
import { Router } from "#/navigation";
import { MainNav } from "#/navigation/main-nav";

function RootWrapper(props: { children?: JSX.Element }) {
  const isLogin = useMatch(() => "/login");
  return (
    <Errored fallback={<HttpErrorPage code={500} class="kbf-clamped-wrap-1800 min-h-dvh py-8" />}>
      <Loading>
        <div class="kbf-clamped-wrap-1800 flex min-h-dvh items-start gap-10 py-12">
          <Show when={!isLogin()}>
            <MainNav />
          </Show>
          <main class="flex-1 pt-2 pr-3 pb-8">{props.children}</main>
        </div>
      </Loading>
    </Errored>
  );
}

export default function App() {
  return <Router>{RootWrapper}</Router>;
}
