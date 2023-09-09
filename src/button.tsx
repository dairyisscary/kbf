import type { ComponentProps } from "solid-js";

import clx from "~/clx";
import Styles from "./button.module.css";

type Props = ComponentProps<"button"> & { variant?: "action" | "cancel" };

export default function Button(props: Props) {
  return (
    <button
      type="button"
      {...props}
      class={clx(Styles.button, props.variant && Styles[props.variant], props.class)}
    />
  );
}
