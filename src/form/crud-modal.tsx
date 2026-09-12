import type { Action } from "@solidjs/router";
import type { JSX, ComponentProps } from "@solidjs/web";
import { createSignal, onSettled, untrack, Show } from "solid-js";

import { Alert } from "#/alert";
import { Button } from "#/button";
import { FormFooter } from "#/form";
import { ConfirmingDeleteButton } from "#/form/confirm";
import { Modal } from "#/modal";

type CrudModalProps<Input extends unknown[], Output, T> = ComponentProps<typeof Modal> & {
  action: Action<Input, Output, T> & JSX.SerializableAttributeValue;
  delete?: {
    confirmingButtonChildren: JSX.Element;
    on: () => Promise<unknown>;
  };
  header: JSX.Element;
  submitChildren?: JSX.Element;
};

export function CrudModal<
  Input extends unknown[] = [formData: FormData],
  Output = string,
  T = unknown,
>(props: CrudModalProps<Input, Output, T>) {
  const [formState, setFormState] = createSignal<Error | null>(null);

  untrack(() => props.action).onSettled((submission) => {
    if (submission.error) {
      setFormState(submission.error);
    } else {
      props.onClose();
    }
  });

  return (
    <Modal onClose={props.onClose}>
      <h1>{props.header}</h1>
      <form method="post" action={props.action}>
        <Show keyed when={formState()}>
          {(error) => (
            <Alert
              ref={(alertElement) => {
                onSettled(() => {
                  alertElement.scrollIntoView();
                });
              }}
              class="mt-6 scroll-my-16"
            >
              {error.message}
            </Alert>
          )}
        </Show>

        {props.children}

        <FormFooter>
          <Show when={props.delete}>
            {(del) => (
              <ConfirmingDeleteButton
                onDelete={() => {
                  void del()
                    .on()
                    .then(() => props.onClose());
                }}
              >
                {del().confirmingButtonChildren}
              </ConfirmingDeleteButton>
            )}
          </Show>
          <Button onClick={props.onClose} class="ml-auto" variant="cancel">
            Cancel
          </Button>
          <Button type="submit">{props.submitChildren || "Save"}</Button>
        </FormFooter>
      </form>
    </Modal>
  );
}
