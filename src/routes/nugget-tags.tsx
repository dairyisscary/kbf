import { action, defineRoute, query, useAction } from "@solidjs/router";
import { reload } from "@solidjs/web";
import { createSignal, createMemo, Show } from "solid-js";

import { Button } from "#/button";
import { ColorCodeSelector, ColorCodePip } from "#/color-code";
import { pealFormData, FormRowWithId, Label } from "#/form";
import { CrudModal } from "#/form/crud-modal";
import { Icon } from "#/icon";
import { KbfSiteTitle } from "#/meta";
import {
  allNuggetTagsWithCounts,
  deleteNuggetTag,
  addNuggetTag,
  editNuggetTag,
} from "#/nugget-tag";
import { requireUser } from "#/session";
import { Table } from "#/table";

type CountedNuggetTag = Awaited<ReturnType<typeof allNuggetTagsWithCounts>>[number];
type ModalState =
  | false
  | { type: "add"; nuggetTag?: never }
  | { type: "edit"; nuggetTag: CountedNuggetTag };

const getAllNuggetTags = query(async () => {
  "use server";
  requireUser();
  return allNuggetTagsWithCounts();
}, "nuggetTagsWithCounts");

const deleteNuggetTagAction = action(async (id: string) => {
  "use server";
  requireUser();
  await deleteNuggetTag(id);
  return reload({ revalidate: getAllNuggetTags.key });
});

const addEditAction = action(async (form: FormData) => {
  "use server";
  requireUser();
  const pealed = pealFormData(form);
  await (pealed.isEditingId
    ? editNuggetTag(pealed.isEditingId as string, pealed)
    : addNuggetTag(pealed));
  return reload({ revalidate: getAllNuggetTags.key });
});

function AddEditModal(props: {
  onClose: () => void;
  editingNuggetTag: undefined | CountedNuggetTag;
}) {
  const deleteAction = useAction(deleteNuggetTagAction);
  const deleteCrud = createMemo(() => {
    if (props.editingNuggetTag) {
      const { id } = props.editingNuggetTag;
      return {
        on: () => deleteAction(id),
        confirmingButtonChildren: `Are you sure you want to delete the "${props.editingNuggetTag.name}" tag?`,
      };
    }
    return undefined;
  });

  return (
    <CrudModal
      action={addEditAction}
      onClose={props.onClose}
      header={`${props.editingNuggetTag ? "Edit" : "Add"} Nugget Tag`}
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
              value={props.editingNuggetTag?.name || ""}
              required
            />
          </>
        )}
      </FormRowWithId>

      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>Color Code</Label>
            <ColorCodeSelector id={id} initColorCode={props.editingNuggetTag?.colorCode} />
          </>
        )}
      </FormRowWithId>

      <input name="isEditingId" type="hidden" value={props.editingNuggetTag?.id || ""} />
    </CrudModal>
  );
}

export const route = defineRoute({
  preload() {
    void getAllNuggetTags();
  },
});

export default function NuggetTags() {
  const nuggetTags = createMemo(() => getAllNuggetTags());
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(false);
  return (
    <>
      <KbfSiteTitle>Manage Nugget Tags</KbfSiteTitle>
      <header class="flex items-center justify-between gap-4 pb-8">
        <h1>Manage Nugget Tags</h1>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="plus" /> Add Nugget Tag
        </Button>
      </header>
      <Table
        class="[&_td]:first:not-only:w-0 [&_td]:first:not-only:min-w-fit [&_td]:last:not-only:text-right [&_td]:last:not-only:font-mono [&_th]:last:text-right"
        headers={["Color", "Name", "Nugget Count"]}
        each={nuggetTags()}
        onRowClick={(nuggetTag) => {
          setAddEditModal({ type: "edit", nuggetTag });
        }}
      >
        {(nuggetTag) => [
          <ColorCodePip block code={nuggetTag.colorCode} />,
          nuggetTag.name,
          nuggetTag.nuggetCount,
        ]}
      </Table>
      <Show when={addEditModal()}>
        {(modalState) => (
          <AddEditModal
            onClose={() => setAddEditModal(false)}
            editingNuggetTag={modalState().nuggetTag}
          />
        )}
      </Show>
    </>
  );
}
