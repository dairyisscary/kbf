import { createSignal, createEffect, createUniqueId, Show, For } from "solid-js";
import { action, query, createAsync, useAction, type RouteDefinition } from "@solidjs/router";

import { KbfSiteTitle } from "~/app";
import { allCategoriesWithCounts, deleteCategory, addCategory, editCategory } from "~/category";
import { CategoryColorPip, CategoryColorSelector } from "~/category/pip";
import { pealFormData, FormFooter, Checkbox, FormRowWithId, Label } from "~/form";
import { ConfirmingDeleteButton } from "~/form/confirm";
import { useClearingSubmission } from "~/form/submission";
import Table from "~/table";
import Button from "~/button";
import Modal from "~/modal";
import Icon from "~/icon";

import Styles from "./categories.module.css";

type CountedCategory = Awaited<ReturnType<typeof allCategoriesWithCounts>>[number];
type ModalState =
  | false
  | { type: "add"; category?: never }
  | { type: "edit"; category: CountedCategory };

const getAllCategories = query(allCategoriesWithCounts, "categoriesForListing");

export const route: RouteDefinition = {
  load() {
    void getAllCategories();
  },
};

const deleteCategoryAction = action(deleteCategory, "deleteCategory");

const addEditAction = action((form: FormData) => {
  const pealed = pealFormData(form);
  pealed.predicates = (pealed.rulesText as string | undefined)?.split("/").filter(Boolean) || [];
  return pealed.isEditingId
    ? editCategory(pealed.isEditingId as string, pealed)
    : addCategory(pealed);
}, "addEditCategory");

function AddEditModal(props: {
  onClose: () => void;
  editingCategory: undefined | CountedCategory;
}) {
  const submitting = useClearingSubmission(addEditAction);
  const doDelete = useAction(deleteCategoryAction);
  const deleting = useClearingSubmission(deleteCategoryAction);
  createEffect(() => {
    if (submitting.result || deleting.result) {
      props.onClose();
    }
  });

  const [selectedColorCode, setSelectedColorCode] = createSignal(props.editingCategory?.colorCode);
  const rulesDescriptionId = createUniqueId();

  return (
    <Modal onClose={props.onClose}>
      <h1>{props.editingCategory ? "Edit" : "Add"} Category</h1>
      <form method="post" action={addEditAction}>
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
            <>
              <Label for={id}>Mass Import Rules</Label>
              <p id={rulesDescriptionId} class="mb-1 text-sm">
                Every mass-imported transaction will automatically receive this category if it
                contains any of these forward-slash (/) separated search strings (case-insensitive).
              </p>
              <input
                id={id}
                type="text"
                name="rulesText"
                autocomplete="off"
                placeholder="ex. delivery/market street/businessname"
                aria-describedby={rulesDescriptionId}
                value={props.editingCategory?.predicates.join("/") || ""}
              />
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
                  void doDelete(category().id);
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
      </form>
    </Modal>
  );
}

function Predicates(props: { values: string[] }) {
  return (
    <div class="grid grid-cols-3 gap-1">
      <For each={props.values}>{(pred) => <div>{pred}</div>}</For>
    </div>
  );
}

export default function Categories() {
  const categories = createAsync(() => getAllCategories());
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(false);
  return (
    <>
      <KbfSiteTitle>Manage Categories</KbfSiteTitle>
      <header class="flex items-center justify-between gap-4 pb-8">
        <h1>Manage Categories</h1>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="plus" /> Add Category
        </Button>
      </header>
      <Table
        class={Styles.table}
        headers={["Color", "Name", "Mass Import Rules", "Transaction Count"]}
        each={categories()}
        onRowClick={(category) => {
          setAddEditModal({ type: "edit", category });
        }}
      >
        {(category) => [
          <CategoryColorPip block code={category.colorCode} />,
          <span class="text-kbf-text-highlight">{category.name}</span>,
          <Predicates values={category.predicates} />,
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
