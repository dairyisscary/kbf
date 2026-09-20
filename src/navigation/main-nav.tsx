import { useNavigate } from "@solidjs/router";
import { createSignal, onSettled } from "solid-js";

import Favicon from "#/favicon.png";
import { Icon, type IconName } from "#/icon";
import { paths } from "#/navigation";
import { destroy } from "#/session";

const ANCHOR_CX =
  "group/nav-anchor relative flex items-center gap-3 p-3 aria-current:text-kbf-text-accent";
const ANCHOR_TEXT_CX = [
  "absolute left-[calc(100%+0.4rem)] hidden rounded bg-black/70 p-2 text-nowrap",
  "md:static md:block md:bg-transparent md:p-0",
  "group-hover/nav-anchor:block group-focus/nav-anchor:block",
];

async function logout() {
  "use server";
  destroy();
}

function Divider() {
  return <div aria-hidden="true" class="my-4 h-px bg-kbf-accent-border" />;
}

function NavLinkContent(props: { title: string; iconName: IconName }) {
  return (
    <>
      <Icon name={props.iconName} />
      <span class={ANCHOR_TEXT_CX}>{props.title}</span>
    </>
  );
}

function BackToTop() {
  const [hidden, setHidden] = createSignal(true);
  onSettled(() => {
    const onScrollCb = () => {
      setHidden(document.documentElement.scrollTop < 100);
    };
    onScrollCb();
    document.addEventListener("scroll", onScrollCb);
    return () => {
      document.removeEventListener("scroll", onScrollCb);
    };
  });
  return (
    <a
      href="/back-to-top"
      class={[
        ANCHOR_CX,
        "transition-opacity duration-300",
        hidden() && "pointer-events-none opacity-0",
      ]}
      tabindex={hidden() ? -1 : undefined}
      onClick={(event) => {
        event.preventDefault();
        document.body.scrollIntoView({ behavior: "smooth" });
      }}
    >
      <NavLinkContent iconName="arrow-up" title="Back to Top" />
    </a>
  );
}

function Logout() {
  const navigate = useNavigate();
  return (
    <a
      href="/logout"
      class={[ANCHOR_CX, "mt-10"]}
      onClick={(event) => {
        event.preventDefault();
        void logout().then(() => navigate(paths.login));
      }}
    >
      <NavLinkContent iconName="log-out" title="Log out" />
    </a>
  );
}

export function MainNav() {
  return (
    <nav class="sticky top-12 flex flex-col border-r border-kbf-accent-border pt-8 pr-5 pb-10 md:w-[clamp(170px,20%,250px)]">
      <a href="/" class={ANCHOR_CX}>
        <img src={Favicon} class="size-6" alt="" />
        <span class={ANCHOR_TEXT_CX}>Dashboard</span>
      </a>

      <Divider />
      <a href={paths.transactions} class={ANCHOR_CX}>
        <NavLinkContent iconName="database" title="Transactions" />
      </a>
      <a href={paths["mass-import"]} class={ANCHOR_CX}>
        <NavLinkContent iconName="file-plus" title="Mass Import" />
      </a>
      <a href={paths.categories} class={ANCHOR_CX}>
        <NavLinkContent iconName="tag" title="Categories" />
      </a>

      <Divider />
      <a href={paths.nuggets} class={ANCHOR_CX}>
        <NavLinkContent iconName="dollar-sign" title="Nuggets" />
      </a>
      <a href={paths["nugget-tags"]} class={ANCHOR_CX}>
        <NavLinkContent iconName="tag" title="Nugget Tags" />
      </a>

      <Divider />
      <a href={paths["asset-snapshots"]} class={ANCHOR_CX}>
        <NavLinkContent iconName="git-merge" title="Asset Snapshots" />
      </a>
      <a href={paths.assets} class={ANCHOR_CX}>
        <NavLinkContent iconName="layers" title="Assets" />
      </a>

      <Logout />
      <BackToTop />
    </nav>
  );
}
