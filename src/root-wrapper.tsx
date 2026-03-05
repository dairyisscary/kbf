import { A, action, useAction, useMatch, useNavigate } from "@solidjs/router";
import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type JSX,
  type ComponentProps,
} from "solid-js";

import clx from "~/clx";
import Favicon from "~/favicon.png";
import Icon from "~/icon";
import { logout } from "~/session";

const logoutAction = action(() => logout(), "logout");

const ANCHOR_CX =
  "group/nav-anchor relative flex items-center gap-3 p-3 [&.active]:text-kbf-text-accent";
const ANCHOR_TEXT_CX = clx(
  "absolute left-[calc(100%+0.4rem)] hidden rounded bg-black/70 p-2 text-nowrap",
  "md:static md:block md:bg-transparent md:p-0",
  "group-hover/nav-anchor:block group-focus/nav-anchor:block",
);

function NavLinkContent(props: { title: string; iconName: ComponentProps<typeof Icon>["name"] }) {
  return (
    <>
      <Icon name={props.iconName} />
      <span class={ANCHOR_TEXT_CX}>{props.title}</span>
    </>
  );
}

function BackToTop() {
  const [hidden, setHidden] = createSignal(true);
  createEffect(() => {
    const onScrollCb = () => {
      setHidden(document.documentElement.scrollTop < 100);
    };
    onScrollCb();
    document.addEventListener("scroll", onScrollCb);
    onCleanup(() => {
      document.removeEventListener("scroll", onScrollCb);
    });
  });
  return (
    <A
      href="/back-to-top"
      class={clx(
        ANCHOR_CX,
        "transition-opacity duration-300",
        hidden() && "pointer-events-none opacity-0",
      )}
      tabindex={hidden() ? -1 : undefined}
      onClick={(event) => {
        event.preventDefault();
        document.body.scrollIntoView({ behavior: "smooth" });
      }}
    >
      <NavLinkContent iconName="arrow-up" title="Back to Top" />
    </A>
  );
}

function Logout() {
  const doLogout = useAction(logoutAction);
  const navigate = useNavigate();
  return (
    <A
      href="/login"
      onClick={(event) => {
        event.preventDefault();
        void doLogout().then(() => {
          navigate("/login");
        });
      }}
      class={clx(ANCHOR_CX, "mt-10")}
    >
      <NavLinkContent iconName="log-out" title="Log out" />
    </A>
  );
}

export default function Wrapper(props: { children: JSX.Element }) {
  const isLogin = useMatch(() => "/login");
  return (
    <div class="kbf-clamped-wrap-1800 flex items-start gap-10 py-12">
      <Show when={!isLogin()}>
        <nav class="sticky top-12 flex flex-col border-r border-kbf-accent-border pt-8 pr-5 pb-10 md:w-[clamp(170px,20%,250px)]">
          <A href="/" class={ANCHOR_CX} end>
            <img src={Favicon} class="size-6" alt="" />
            <span class={ANCHOR_TEXT_CX}>Dashboard</span>
          </A>
          <A href="/transactions" class={ANCHOR_CX}>
            <NavLinkContent iconName="database" title="Transactions" />
          </A>
          <A href="/mass-import" class={ANCHOR_CX}>
            <NavLinkContent iconName="file-plus" title="Mass Import" />
          </A>
          <A href="/categories" class={ANCHOR_CX}>
            <NavLinkContent iconName="layers" title="Categories" />
          </A>
          <Logout />
          <BackToTop />
        </nav>
      </Show>
      <main class="flex-1 pt-2 pr-3 pb-8">{props.children}</main>
    </div>
  );
}
