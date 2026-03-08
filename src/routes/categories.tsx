import { action, query, createAsync, useAction, type RouteDefinition } from "@solidjs/router";
import { createSignal, createEffect, createUniqueId, Show, For } from "solid-js";

import Button from "~/button";
import { allCategoriesWithCounts, deleteCategory, addCategory, editCategory } from "~/category";
import { CategoryColorPip, CategoryColorSelector, CategoryKindIcon } from "~/category/pip";
import {
  pealFormData,
  FormFooter,
  Checkbox,
  FormRowWithId,
  Label,
  RadioTabs,
  FieldSet,
} from "~/form";
import { ConfirmingDeleteButton } from "~/form/confirm";
import { useClearingSubmission } from "~/form/submission";
import Icon from "~/icon";
import { KbfSiteTitle } from "~/meta";
import Modal from "~/modal";
import Table from "~/table";

type CountedCategory = Awaited<ReturnType<typeof allCategoriesWithCounts>>[number];
type ModalState =
  | false
  | { type: "add"; category?: undefined }
  | { type: "edit"; category: CountedCategory };

const KIND_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "payment", label: "Payment" },
] as const;

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
            <FieldSet legend="Kind">
              <RadioTabs
                id={id}
                name="kind"
                options={KIND_OPTIONS}
                initValue={props.editingCategory?.kind || "basic"}
              />
            </FieldSet>
          )}
        </FormRowWithId>

        <FormRowWithId>
          {(id) => (
            <Checkbox name="archived" checked={props.editingCategory?.archived ?? false} id={id}>
              Archived (Hidden from transaction creation)
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
        class="[&_td]:first:not-only:w-0 [&_td]:first:not-only:min-w-fit [&_td]:last:not-only:text-right [&_td]:last:not-only:font-mono [&_th]:last:text-right"
        headers={["Class", "Name", "Mass Import Rules", "Transaction Count"]}
        each={categories()}
        onRowClick={(category) => {
          setAddEditModal({ type: "edit", category });
        }}
      >
        {(category) => [
          <CategoryColorPip block code={category.colorCode}>
            <CategoryKindIcon size="sm" kind={category.kind} />
          </CategoryColorPip>,
          <>
            <span class={category.archived ? "line-through" : "text-kbf-text-highlight"}>
              {category.name}
            </span>
            {category.archived && " (Archived)"}
          </>,
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
