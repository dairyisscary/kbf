import { createEffect, onCleanup, Show, type JSXElement, type ComponentProps } from "solid-js";
import { useAction, useSubmission, type Action } from "@solidjs/router";

import Modal from "~/modal";
import Button from "~/button";
import Alert from "~/alert";
import { FormFooter } from "~/form";
import { ConfirmingDeleteButton } from "~/form/confirm";

type SerializableFormAction = ComponentProps<"form">["action"];
type FormModalProps<Input extends unknown[], Output, T> = ComponentProps<typeof Modal> & {
  action: Action<Input, Output, T> & SerializableFormAction;
  delete?: {
    confirmingButtonChildren: JSXElement;
    id: string;
    action: Action<[id: string], string, [id: string]>;
  };
  header: JSXElement;
};

export function useClearingSubmission(action: Parameters<typeof useSubmission>[0]) {
  const submission = useSubmission(action);
  onCleanup(() => {
    if (submission.result || submission.error) {
      submission.clear();
    }
  });
  return submission;
}

export function FormModal<
  Input extends unknown[] = [formData: FormData],
  Output = string,
  T = unknown,
>(props: FormModalProps<Input, Output, T>) {
  const submitting = useClearingSubmission(props.action);

  const doDelete = props.delete && useAction(props.delete.action);
  const deleting = props.delete && useClearingSubmission(props.delete.action);

  createEffect(() => {
    if (submitting.result || deleting?.result) {
      props.onClose();
    }
  });

  return (
    <Modal onClose={props.onClose}>
      <h1>{props.header}</h1>
      <form method="post" action={props.action}>
        <Show when={submitting.error as null | Error}>
          {(error) => <Alert class="mt-6">{error().message}</Alert>}
        </Show>

        {props.children}

        <FormFooter>
          <Show when={props.delete}>
            {(del) => (
              <ConfirmingDeleteButton
                onDelete={() => {
                  void doDelete!(del().id);
                }}
              >
                {del().confirmingButtonChildren}
              </ConfirmingDeleteButton>
            )}
          </Show>
          <Button onClick={props.onClose} class="ml-auto" variant="cancel">
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </FormFooter>
      </form>
    </Modal>
  );
}
