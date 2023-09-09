import type { JSX } from "solid-js";

import clx from "~/clx";

export default function Alert(props: { class?: string; children: JSX.Element }) {
  return (
    <p
      class={clx(
        "rounded-md border-2 border-kbf-action-highlight bg-kbf-light-purple px-4 py-3 text-lg text-kbf-text-highlight",
        props.class,
      )}
    >
      {props.children}
    </p>
  );
}
