import { createEffect, onCleanup, type ComponentProps } from "solid-js";

import clx from "~/clx";

import Styles from "./modal.module.css";

type Props = ComponentProps<"dialog"> & { onClose: () => void };

export default function Modal(props: Props) {
  let dialogRef: HTMLDialogElement | undefined;
  createEffect(() => {
    const { body } = document;
    const keydownCb = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    body.classList.add("overflow-hidden");
    body.addEventListener("keydown", keydownCb);
    dialogRef!.showModal();

    onCleanup(() => {
      body.classList.remove("overflow-hidden");
      body.removeEventListener("keydown", keydownCb);
      dialogRef!.close();
    });
  });
  return <dialog ref={dialogRef} {...props} class={clx(Styles.modal, props.class)} />;
}
