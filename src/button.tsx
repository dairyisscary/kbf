import type { ComponentProps } from "@solidjs/web";
import { omit } from "solid-js";

type Props = ComponentProps<"button"> & { variant?: "action" | "cancel" };

export function Button(props: Props) {
  const rest = omit(props, "variant");
  return (
    <button
      type="button"
      {...rest}
      class={[
        "inline-flex items-center justify-center gap-2 border-2 border-kbf-action transition-colors duration-300 hover:bg-kbf-action-alt",
        props.variant === "cancel"
          ? "bg-kbf-dark-purple text-kbf-text-main aria-pressed:bg-kbf-action aria-pressed:text-kbf-text-highlight"
          : "bg-kbf-action text-kbf-text-highlight",
        props.class,
      ]}
    />
  );
}
