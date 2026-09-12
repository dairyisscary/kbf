import type { ComponentProps } from "@solidjs/web";
import { onSettled } from "solid-js";

type Props = Omit<ComponentProps<"dialog">, "class"> & { onClose: () => void };

export function Modal(props: Props) {
  let dialogRef: HTMLDialogElement | undefined; // oxlint-disable-line no-unassigned-vars
  onSettled(() => {
    const { body } = document;
    const keydownCb = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    body.addEventListener("keydown", keydownCb);
    body.classList.add("overflow-hidden");
    dialogRef!.showModal();

    return () => {
      dialogRef!.close();
      body.classList.remove("overflow-hidden");
      body.removeEventListener("keydown", keydownCb);
    };
  });
  return (
    <dialog
      ref={dialogRef}
      {...props}
      class="kbf-clamped-wrap-800 my-auto bg-transparent py-12 backdrop:animate-fade-in backdrop:bg-kbf-dark-purple/60 backdrop:backdrop-blur open:animate-fade-in"
    />
  );
}
