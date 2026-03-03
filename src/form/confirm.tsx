import { createSignal, Show, type JSX } from "solid-js";

import Modal from "~/modal";
import Button from "~/button";
import Icon from "~/icon";

export function ConfirmingDeleteButton(props: { children: JSX.Element; onDelete: () => void }) {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button variant="cancel" onClick={() => setOpen(true)}>
        <Icon name="trash-2" />
      </Button>
      <Show when={open()}>
        <Modal onClose={() => setOpen(false)}>
          <div class="flex items-center gap-4">
            <h1 class="flex-1">{props.children}</h1>
            <Button variant="cancel" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={props.onDelete}>Do it</Button>
          </div>
        </Modal>
      </Show>
    </>
  );
}
