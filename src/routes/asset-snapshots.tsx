import { createSignal, Switch, Match, For } from "solid-js";
import { action, query, createAsync, type RouteDefinition } from "@solidjs/router";

import {
  allAssetSnapshots,
  addAssetSnapshot,
  deleteAssetSnapshot,
  editAssetSnapshot,
} from "~/asset-snapshot";
import { allAssetSnapshotKinds } from "~/asset-snapshot/kind";
import { KbfSiteTitle } from "~/app";
import { formatCurrencySign, formatDate, formatDateOnly, formatMoneyAmount } from "~/format";
import { pealFormData, FormRowWithId, Label } from "~/form";
import { FormModal } from "~/form/submission";
import Table from "~/table";
import Button from "~/button";
import Icon from "~/icon";
import { AssetValuePill } from "~/asset-snapshot/pip";

import Styles from "./asset-snapshots.module.css";

type Snapshot = Awaited<ReturnType<typeof allAssetSnapshots>>[number];
type SnapshotKind = Awaited<ReturnType<typeof allAssetSnapshotKinds>>[number];
type ModalState = null | { type: "add"; snapshot?: never } | { type: "edit"; snapshot: Snapshot };

const getAllAssetSnapshotsForListing = query(allAssetSnapshots, "allSnapshotsForListing");
const getAllAssetSnapshotKindsForListing = query(
  allAssetSnapshotKinds,
  "allSnapshotKindsForListing",
);

export const route: RouteDefinition = {
  load() {
    void getAllAssetSnapshotsForListing();
    void getAllAssetSnapshotKindsForListing();
  },
};

const deleteAssetSnapshotAction = action(deleteAssetSnapshot, "deleteAssetSnapshot");

const addSnapshotAction = action((formData: FormData) => {
  const pealed = pealFormData(formData);
  return Promise.all(
    Object.entries(pealed).flatMap(([key, value]) => {
      if (!value || !key.startsWith("multi|")) {
        return [];
      }
      const [, assetSnapshotKindId] = key.split("|");
      return addAssetSnapshot({
        when: pealed.when,
        amount: value,
        assetSnapshotKindId,
      });
    }),
  );
}, "addSnapshot");

const editSnapshotAction = action((formData: FormData) => {
  const pealed = pealFormData(formData);
  return editAssetSnapshot(pealed.isEditingId as string, pealed);
}, "editSnapshot");

function AddModal(props: { allSnapshotKinds: SnapshotKind[]; onClose: () => void }) {
  return (
    <FormModal action={addSnapshotAction} header="Add Snapshots" onClose={props.onClose}>
      <FormRowWithId class="border-b border-kbf-accent-border pb-14">
        {(id) => (
          <>
            <Label for={id}>Snapshot Date</Label>
            <input
              type="date"
              autocomplete="off"
              name="when"
              required
              id={id}
              value={formatDateOnly(new Date())}
            />
          </>
        )}
      </FormRowWithId>

      <For each={props.allSnapshotKinds}>
        {(snapshotKind) => (
          <>
            <FormRowWithId>
              {(id) => (
                <>
                  <Label for={id}>{snapshotKind.name}</Label>
                  <input
                    type="text"
                    autocomplete="off"
                    inputmode="numeric"
                    pattern="^\d+(\.\d{0,2})?$"
                    id={id}
                    name={`multi|${snapshotKind.id}|amount`}
                  />
                </>
              )}
            </FormRowWithId>
          </>
        )}
      </For>
    </FormModal>
  );
}

function EditModal(props: { editingSnapshot: Snapshot; onClose: () => void }) {
  return (
    <FormModal
      onClose={props.onClose}
      header="Edit Snapshot"
      action={editSnapshotAction}
      delete={{
        id: props.editingSnapshot.id,
        confirmingButtonChildren: `Are you sure you want to delete this ${props.editingSnapshot.kind.name} snapshot?`,
        action: deleteAssetSnapshotAction,
      }}
    >
      <input name="editingId" type="hidden" value={props.editingSnapshot.id} />

      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>Snapshot Date</Label>
            <input
              type="date"
              autocomplete="off"
              name="when"
              required
              id={id}
              value={formatDateOnly(new Date())}
            />
          </>
        )}
      </FormRowWithId>

      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>Amount</Label>
            <input
              type="text"
              autocomplete="off"
              inputmode="numeric"
              pattern="^\d+(\.\d{0,2})?$"
              name="amount"
              value={props.editingSnapshot.amount}
              id={id}
            />
          </>
        )}
      </FormRowWithId>
    </FormModal>
  );
}

export default function SnapshotCapture() {
  const snapshots = createAsync(() => getAllAssetSnapshotsForListing());
  const snapshotKinds = createAsync(() => getAllAssetSnapshotKindsForListing());
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(null);
  return (
    <>
      <KbfSiteTitle>Capture Snapshots</KbfSiteTitle>
      <header class="flex items-center justify-between gap-4 pb-8">
        <h1>Capture and Manage Snapshots</h1>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="plus" /> Add Snapshots
        </Button>
      </header>
      <Table
        class={Styles.table}
        headers={["Kind", "Date", "Value"]}
        each={snapshots()}
        onRowClick={(snapshot) => {
          setAddEditModal({ type: "edit", snapshot });
        }}
      >
        {(snapshot) => [
          <span class="text-kbf-text-highlight">{snapshot.kind.name}</span>,
          formatDate(snapshot.when),
          <AssetValuePill assetSnapshot={snapshot} />,
        ]}
      </Table>
      <Switch>
        <Match
          when={(() => {
            const state = addEditModal();
            return state?.type === "add" && state;
          })()}
        >
          <AddModal allSnapshotKinds={snapshotKinds()!} onClose={() => setAddEditModal(null)} />
        </Match>
        <Match
          when={(() => {
            const state = addEditModal();
            return state?.type === "edit" && state;
          })()}
        >
          {(state) => (
            <EditModal editingSnapshot={state().snapshot} onClose={() => setAddEditModal(null)} />
          )}
        </Match>
      </Switch>
    </>
  );
}
