import { Show, createEffect, createSignal, onCleanup, type JSX } from "solid-js";
import { A, useMatch } from "solid-start";

import clx from "~/clx";
import Icon from "~/icon";
import Favicon from "~/favicon.png";

import Styles from "./root-wrapper.module.css";

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
      <Icon name="arrow-up" />
      <span>Back to Top</span>
    </A>
  );
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
          <A href="/transactions">
            <Icon name="database" />
            <span>Transactions</span>
          </A>
          <A href="/mass-import">
            <Icon name="file-plus" />
            <span>Mass Import</span>
          </A>
          <A href="/categories">
            <Icon name="layers" />
            <span>Categories</span>
          </A>
          <A class="mt-8" href="/logout">
            <Icon name="log-out" />
            <span>Log out</span>
          </A>
          <BackToTop />
        </nav>
      </Show>
      <main class="flex-1 pb-8 pl-10 pt-2">{props.children}</main>
    </div>
  );
}
