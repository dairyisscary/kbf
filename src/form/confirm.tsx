import type { JSX } from "@solidjs/web";
import { action, createSignal, Show } from "solid-js";

import { Alert } from "#/alert";
import { Button } from "#/button";
import { Icon } from "#/icon";
import { Modal } from "#/modal";

type ConfirmingDeleteButtonProps = {
  children: JSX.Element;
  onDelete: () => Promise<unknown>;
};

type Confirming =
  | { kind: "open" | "closed"; error?: never }
  | { kind: "open-error"; error: string };

export function ConfirmingDeleteButton(props: ConfirmingDeleteButtonProps) {
  const [confirming, setConfirming] = createSignal<Confirming>({ kind: "closed" });
  const close = () => setConfirming({ kind: "closed" });

  const deleteAction = action(function* () {
    yield props.onDelete();
    close();
  });

  return (
    <>
      <Button variant="cancel" onClick={() => setConfirming({ kind: "open" })}>
        <Icon name="trash-2" />
      </Button>
      <Show when={confirming().kind !== "closed"}>
        <Modal onClose={close}>
          <Show when={confirming().error}>{(error) => <Alert class="mb-8">{error()}</Alert>}</Show>
          <div class="flex items-center gap-4">
            <h1 class="flex-1">{props.children}</h1>
            <Button variant="cancel" onClick={close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                deleteAction()
                  .then(close)
                  .catch((error) => {
                    setConfirming({
                      kind: "open-error",
                      error: error instanceof Error ? error.message : "Could not delete",
                    });
                  });
              }}
            >
              Do it
            </Button>
          </div>
        </Modal>
      </Show>
    </>
  );
}
