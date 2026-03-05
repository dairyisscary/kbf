import { splitProps, type ComponentProps } from "solid-js";

import clx from "~/clx";

type Props = ComponentProps<"button"> & { variant?: "action" | "cancel" };

export default function Button(props: Props) {
  const [local, rest] = splitProps(props, ["class", "variant"]);
  return (
    <button
      type="button"
      {...rest}
      class={clx(
        "inline-flex items-center justify-center gap-2 border-2 border-kbf-action transition-colors duration-300 hover:bg-kbf-action-alt",
        local.variant === "cancel"
          ? "bg-kbf-dark-purple text-kbf-text-main aria-pressed:bg-kbf-action aria-pressed:text-kbf-text-highlight"
          : "bg-kbf-action text-kbf-text-highlight",
        local.class,
      )}
    />
  );
}
