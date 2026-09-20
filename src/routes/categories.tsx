import { action, defineRoute, query, useAction } from "@solidjs/router";
import { reload } from "@solidjs/web";
import { createSignal, createMemo, createUniqueId, Show, For } from "solid-js";

import { Button } from "#/button";
import { allCategoriesWithCounts, deleteCategory, addCategory, editCategory } from "#/category";
import { CategoryKindIcon } from "#/category/pip";
import { ColorCodePip, ColorCodeSelector } from "#/color-code";
import { pealFormData, Checkbox, FormRowWithId, Label, RadioTabs, FieldSet } from "#/form";
import { CrudModal } from "#/form/crud-modal";
import { Icon } from "#/icon";
import { KbfSiteTitle } from "#/meta";
import { requireUser } from "#/session";
import { Table } from "#/table";

type CountedCategory = Awaited<ReturnType<typeof allCategoriesWithCounts>>[number];
type ModalState =
  | false
  | { type: "add"; category?: never }
  | { type: "edit"; category: CountedCategory };

const KIND_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "payment", label: "Payment" },
] as const;

const getAllCategories = query(async () => {
  "use server";
  requireUser();
  return allCategoriesWithCounts();
}, "categoriesWithCounts");

const deleteCategoryAction = action(async (id: string) => {
  "use server";
  requireUser();
  await deleteCategory(id);
  return reload({ revalidate: getAllCategories.key });
});

const addEditAction = action(async (form: FormData) => {
  "use server";
  requireUser();
  const pealed = pealFormData(form);
  pealed.predicates = (pealed.rulesText as string | undefined)?.split("/").filter(Boolean) || [];
  await (pealed.isEditingId
    ? editCategory(pealed.isEditingId as string, pealed)
    : addCategory(pealed));
  return reload({ revalidate: getAllCategories.key });
});

function AddEditModal(props: {
  onClose: () => void;
  editingCategory: undefined | CountedCategory;
}) {
  const rulesDescriptionId = createUniqueId();

  const deleteAction = useAction(deleteCategoryAction);
  const deleteCrud = createMemo(() => {
    if (props.editingCategory) {
      const { id } = props.editingCategory;
      return {
        on: () => deleteAction(id),
        confirmingButtonChildren: `Are you sure you want to delete the "${props.editingCategory.name}" category?`,
      };
    }
    return undefined;
  });

  return (
    <CrudModal
      action={addEditAction}
      onClose={props.onClose}
      header={`${props.editingCategory ? "Edit" : "Add"} Category`}
      delete={deleteCrud()}
    >
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
            <ColorCodeSelector id={id} initColorCode={props.editingCategory?.colorCode} />
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
    </CrudModal>
  );
}

function Predicates(props: { values: string[] }) {
  return (
    <div class="grid grid-cols-3 gap-1">
      <For each={props.values}>{(pred) => <div>{pred}</div>}</For>
    </div>
  );
}

export const route = defineRoute({
  preload() {
    void getAllCategories();
  },
});

export default function Categories() {
  const categories = createMemo(() => getAllCategories());
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
          <ColorCodePip block code={category.colorCode}>
            <CategoryKindIcon size="sm" kind={category.kind} />
          </ColorCodePip>,
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
