import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type JSX,
  type ComponentProps,
} from "solid-js";
import { A, action, useAction, useMatch, useNavigate } from "@solidjs/router";

import { logout } from "~/session";
import clx from "~/clx";
import Icon from "~/icon";
import Favicon from "~/favicon.png";

import Styles from "./root-wrapper.module.css";

const logoutAction = action(() => logout(), "logout");

function NavLinkContent(props: { title: string; iconName: ComponentProps<typeof Icon>["name"] }) {
  return (
    <>
      <Icon name={props.iconName} />
      <span>{props.title}</span>
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
      class={clx("transition-opacity duration-300", hidden() && "pointer-events-none opacity-0")}
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
      class="mt-8"
      href="/login"
      onClick={(event) => {
        event.preventDefault();
        void doLogout().then(() => {
          navigate("/login");
        });
      }}
    >
      <NavLinkContent iconName="log-out" title="Log out" />
    </A>
  );
}

function Divider() {
  return <div aria-hidden="true" class="my-4 h-px bg-kbf-accent-border" />;
}

export default function Wrapper(props: { children: JSX.Element }) {
  const isLogin = useMatch(() => "/login");
  return (
    <div class={Styles.wrapper}>
      <Show when={!isLogin()}>
        <nav class={Styles.nav}>
          <A href="/" end>
            <img src={Favicon} alt="" />
            <span>Dashboard</span>
          </A>

          <Divider />
          <A href="/transactions">
            <NavLinkContent iconName="database" title="Transactions" />
          </A>
          <A href="/mass-import">
            <NavLinkContent iconName="file-plus" title="Mass Import" />
          </A>
          <A href="/categories">
            <NavLinkContent iconName="layers" title="Categories" />
          </A>

          <Divider />
          <A href="/asset-snapshots">
            <NavLinkContent iconName="camera" title="Snapshots" />
          </A>
          <A href="/asset-snapshot-kinds">
            <NavLinkContent iconName="layers" title="Snapshot Kinds" />
          </A>
          <Logout />
          <BackToTop />
        </nav>
      </Show>
      <main class="flex-1 pb-8 pr-3 pt-2">{props.children}</main>
    </div>
  );
}
