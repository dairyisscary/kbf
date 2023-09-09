import { createSignal, createEffect, Show } from "solid-js";
import { useRouteData } from "solid-start";
import { createServerData$, createServerAction$ } from "solid-start/server";

import { Title } from "~/root";
import { allCategoriesWithCounts, deleteCategory, addCategory, editCategory } from "~/category";
import { CategoryColorPip, CategoryColorSelector } from "~/category/pip";
import { pealFormData, FormFooter, Checkbox, FormRowWithId, Label } from "~/form";
import { ConfirmingDeleteButton } from "~/form/confirm";
import Table from "~/table";
import Button from "~/button";
import Modal from "~/modal";
import Icon from "~/icon";

type Category = Awaited<ReturnType<typeof allCategoriesWithCounts>>[number];
type ModalState =
  | false
  | { type: "add"; category?: undefined }
  | { type: "edit"; category: Category };

export function routeData() {
  return createServerData$(allCategoriesWithCounts);
}

function AddEditModal(props: { onClose: () => void; editingCategory: undefined | Category }) {
  const [submitting, { Form }] = createServerAction$((form: FormData) => {
    const pealed = pealFormData(form);
    return pealed.isEditingId
      ? editCategory(pealed.isEditingId as string, pealed)
      : addCategory(pealed);
  });
  const [deleting, doDelete] = createServerAction$((input: { id: string }) => {
    return deleteCategory(input.id);
  });
  createEffect(() => {
    if (submitting.result || deleting.result) {
      props.onClose();
    }
  });

  const [selectedColorCode, setSelectedColorCode] = createSignal(props.editingCategory?.colorCode);

  return (
    <Modal onClose={props.onClose}>
      <h1>{props.editingCategory ? "Edit" : "Add"} Category</h1>
      <Form>
        <FormRowWithId>
          {(id) => (
            <>
              <Label for={id}>Name</Label>
              <input
                id={id}
                type="text"
                name="name"
                autocomplete="off"
                value={props.editingCategory?.name || ""}
                required
              />
            </>
          )}
        </FormRowWithId>

        <FormRowWithId>
          {(id) => (
            <>
              <Label for={id}>Color Code</Label>
              <CategoryColorSelector onChange={setSelectedColorCode} value={selectedColorCode()} />
              <input type="hidden" id={id} name="colorCode" value={selectedColorCode() || ""} />
            </>
          )}
        </FormRowWithId>

        <FormRowWithId>
          {(id) => (
            <Checkbox
              name="ignoredForBreakdownReporting"
              checked={props.editingCategory?.ignoredForBreakdownReporting}
              id={id}
            >
              Exclude this category from breakdown reporting
            </Checkbox>
          )}
        </FormRowWithId>

        <input name="isEditingId" type="hidden" value={props.editingCategory?.id || ""} />

        <FormFooter>
          <Show when={props.editingCategory}>
            {(category) => (
              <ConfirmingDeleteButton
                onDelete={() => {
                  doDelete({ id: category().id }).catch(() => {});
                }}
              >
                {`Are you sure you want to delete ${category().name}?`}
              </ConfirmingDeleteButton>
            )}
          </Show>
          <Button onclick={props.onClose} class="ml-auto" variant="cancel">
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </FormFooter>
      </Form>
    </Modal>
  );
}

export default function Categories() {
  const categories = useRouteData<typeof routeData>();
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(false);
  return (
    <>
      <Title>Manage Categories</Title>
      <header class="flex items-center justify-between gap-4 pb-8">
        <h1>Manage Categories</h1>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="plus" /> Add Category
        </Button>
      </header>
      <Table
        headers={["Name", "Color", "Transaction Count"]}
        each={categories()}
        onRowClick={(category) => {
          setAddEditModal({ type: "edit", category });
        }}
      >
        {(category) => [
          <span class="text-kbf-text-highlight">{category.name}</span>,
          <CategoryColorPip code={category.colorCode} />,
          category.transactionCount,
        ]}
      </Table>
      <Show when={addEditModal()}>
        {(modalState) => (
          <AddEditModal
            onClose={() => setAddEditModal(false)}
            editingCategory={modalState().category}
          />
        )}
      </Show>
    </>
  );
}
