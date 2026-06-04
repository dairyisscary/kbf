import { useAction, type Action } from "@solidjs/router";
import { createEffect, Show, type JSX, type ComponentProps } from "solid-js";

import Alert from "~/alert";
import Button from "~/button";
import { FormFooter } from "~/form";
import { ConfirmingDeleteButton } from "~/form/confirm";
import { useClearingSubmission } from "~/form/submission";
import Modal from "~/modal";

type CrudModalProps<Input extends unknown[], Output, T> = ComponentProps<typeof Modal> & {
  action: Action<Input, Output, T> & JSX.SerializableAttributeValue;
  delete?: {
    confirmingButtonChildren: JSX.Element;
    id: string;
    action: Action<[id: string], string, [id: string]>;
  };
  header: JSX.Element;
  submitChildren?: JSX.Element;
};

export function CrudModal<
  Input extends unknown[] = [formData: FormData],
  Output = string,
  T = unknown,
>(props: CrudModalProps<Input, Output, T>) {
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
          <Button type="submit">{props.submitChildren || "Save"}</Button>
        </FormFooter>
      </form>
    </Modal>
  );
}
