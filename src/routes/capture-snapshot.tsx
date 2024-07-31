import { createSignal, createEffect, createUniqueId, Show, For } from "solid-js";
import { action, cache, createAsync, type RouteDefinition } from "@solidjs/router";

import { addAssetSnapshotKind, allAssetSnapshotKinds } from "~/asset-snapshot/kind";
import { KbfSiteTitle } from "~/app";
import { formatCurrencySign } from "~/format";
import { pealFormData, FormFooter, Checkbox, FormRowWithId, Label } from "~/form";
import Table from "~/table";
import Button from "~/button";
import Modal from "~/modal";
import Icon from "~/icon";

type SnapshotKind = Awaited<ReturnType<typeof allAssetSnapshotKinds>>[number];
type ModalState = false | { type: "add"; kind?: never } | { type: "edit"; kind: SnapshotKind };

const getAllAssetSnapshotKinds = cache(allAssetSnapshotKinds, "allSnapshotKindsForListing");

export const route: RouteDefinition = {
  load() {
    void getAllAssetSnapshotKinds();
  },
};

const addEditSnapshotKind = action((formData: FormData) => {
  const pealed = pealFormData(formData);
  return pealed.isEditingId
    ? editAssetSnapshotKind(pealed.isEditingId as string, pealed)
    : addAssetSnapshotKind(pealed);
}, "addEditSnapshotKind");

function AddEditModal(props: { onClose: () => void; editingKind?: SnapshotKind }) {
  const [currency, setCurrency] = createSignal<SnapshotKind["currency"]>(
    props.editingKind?.currency || "usd",
  );
  return (
    <Modal onClose={props.onClose}>
      <h1>{props.editingKind ? "Edit" : "Add"} Snapshot Kind</h1>
      <form method="post" action={addEditSnapshotKind}>
        <FormRowWithId>
          {(id) => (
            <>
              <Label for={id}>Name</Label>
              <input
                id={id}
                type="text"
                name="name"
                autocomplete="off"
                value={props.editingKind?.name || ""}
                required
              />
            </>
          )}
        </FormRowWithId>

        <Button
          class="aspect-square text-xl"
          onClick={() => setCurrency((c) => (c === "euro" ? "usd" : "euro"))}
        >
          {formatCurrencySign(currency())}
        </Button>
        <input type="hidden" name="currency" value={currency()} />

        <FormRowWithId>
          {(id) => (
            <Checkbox name="taxAdvantaged" checked={props.editingKind?.taxAdvantaged} id={id}>
              Asset is Tax Advantaged
            </Checkbox>
          )}
        </FormRowWithId>

        <input name="isEditingId" type="hidden" value={props.editingKind?.id || ""} />

        <FormFooter>
          <Button onclick={props.onClose} class="ml-auto" variant="cancel">
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </FormFooter>
      </form>
    </Modal>
  );
}

export default function SnapshotCapture() {
  const kinds = createAsync(() => getAllAssetSnapshotKinds());
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(false);
  return (
    <>
      <KbfSiteTitle>Capture Snapshot</KbfSiteTitle>
      <header class="flex items-center justify-between gap-4 pb-8">
        <h1>Capture an Asset Snapshot</h1>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="plus" /> Add Snapshot Kind
        </Button>
      </header>
      <Table
        headers={["Name", "Currency", "Tax Advantaged"]}
        each={kinds()}
        onRowClick={(kind) => {
          setAddEditModal({ type: "edit", kind });
        }}
      >
        {(kind) => [
          <span class="text-kbf-text-highlight">{kind.name}</span>,
          formatCurrencySign(kind.currency),
          kind.taxAdvantaged ? "Yes" : "No",
        ]}
      </Table>
      <Show when={addEditModal()}>
        {(modalState) => (
          <AddEditModal onClose={() => setAddEditModal(false)} editingKind={modalState().kind} />
        )}
      </Show>
    </>
  );
}
