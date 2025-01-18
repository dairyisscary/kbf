import { createSignal, Show } from "solid-js";
import { action, query, createAsync, type RouteDefinition } from "@solidjs/router";

import {
  addAssetSnapshotKind,
  editAssetSnapshotKind,
  deleteAssetSnapshotKind,
  allAssetSnapshotKinds,
} from "~/asset-snapshot/kind";
import { KbfSiteTitle } from "~/app";
import { formatCurrencySign } from "~/format";
import { pealFormData, Checkbox, FormRowWithId, Label } from "~/form";
import { FormModal } from "~/form/submission";
import Table from "~/table";
import Button from "~/button";
import Icon from "~/icon";

type SnapshotKind = Awaited<ReturnType<typeof allAssetSnapshotKinds>>[number];
type ModalState = false | { type: "add"; kind?: never } | { type: "edit"; kind: SnapshotKind };

const getAllAssetSnapshotKinds = query(allAssetSnapshotKinds, "allSnapshotKindsForListing");

export const route: RouteDefinition = {
  load() {
    void getAllAssetSnapshotKinds();
  },
};

const addEditSnapshotKindAction = action((formData: FormData) => {
  const pealed = pealFormData(formData);
  return pealed.isEditingId
    ? editAssetSnapshotKind(pealed.isEditingId as string, pealed)
    : addAssetSnapshotKind(pealed);
}, "addEditSnapshotKind");

const deleteAssetSnapshotKindAction = action(deleteAssetSnapshotKind, "deleteAssetSnapshotKind");

function AddEditModal(props: { onClose: () => void; editingKind?: SnapshotKind }) {
  const [currency, setCurrency] = createSignal<SnapshotKind["currency"]>(
    props.editingKind?.currency || "usd",
  );
  return (
    <FormModal
      action={addEditSnapshotKindAction}
      header={`${props.editingKind ? "Edit" : "Add"} Snapshot Kind`}
      delete={
        props.editingKind && {
          id: props.editingKind.id,
          action: deleteAssetSnapshotKindAction,
          confirmingButtonChildren: (
            <>
              Are you <strong class="text-kbf-action">really</strong> sure you want to delete{" "}
              {props.editingKind.name} asset kind?
            </>
          ),
        }
      }
      onClose={props.onClose}
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
              value={props.editingKind?.name || ""}
              required
            />
          </>
        )}
      </FormRowWithId>

      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>Currency</Label>
            <div>
              <Button
                class="aspect-square text-xl"
                onClick={() => setCurrency((c) => (c === "euro" ? "usd" : "euro"))}
              >
                {formatCurrencySign(currency())}
              </Button>
            </div>
            <input id={id} type="hidden" name="currency" value={currency()} />
          </>
        )}
      </FormRowWithId>

      <FormRowWithId>
        {(id) => (
          <Checkbox name="taxAdvantaged" checked={props.editingKind?.taxAdvantaged} id={id}>
            Asset is Tax Advantaged
          </Checkbox>
        )}
      </FormRowWithId>

      <input name="isEditingId" type="hidden" value={props.editingKind?.id || ""} />
    </FormModal>
  );
}

export default function SnapshotCapture() {
  const kinds = createAsync(() => getAllAssetSnapshotKinds());
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(false);
  return (
    <>
      <KbfSiteTitle>Manage Asset Snapshot Kinds</KbfSiteTitle>
      <header class="flex items-center justify-between gap-4 pb-8">
        <h1>Manage Asset Snapshot Kinds</h1>
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
          <span class="uppercase">{kind.currency}</span>,
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
