import { action, query, createAsync, type RouteDefinition, useSearchParams } from "@solidjs/router";
import { subDays } from "date-fns";
import { createSignal, Switch, Match, For, untrack } from "solid-js";

import {
  allAssetSnapshotsByAsset,
  addAssetSnapshot,
  deleteAssetSnapshot,
  editAssetSnapshot,
} from "~/asset-snapshot";
import { AssetValuePill } from "~/asset-snapshot/pip";
import Button from "~/button";
import { pealFormData, FormRowWithId, Label, FormRowDivider } from "~/form";
import { CrudModal } from "~/form/crud-modal";
import { formatDate, formatDateOnly } from "~/format";
import Icon from "~/icon";
import { KbfSiteTitle } from "~/meta";
import { FilterContainer, TimeFrameFilters } from "~/query-filters";
import Table from "~/table";

type AssetAndSnapshots = Awaited<ReturnType<typeof allAssetSnapshotsByAsset>>[number];
type Asset = AssetAndSnapshots["asset"];
type AssetSnapshot = AssetAndSnapshots["snapshots"][number];
type ModalState =
  | null
  | { type: "add"; snapshot?: never }
  | { type: "edit"; snapshot: AssetSnapshot; asset: Asset };

const getAllAssetSnapshotsForListing = query(
  (params: Record<string, string | string[] | undefined>) => {
    switch (params.timeFrame) {
      case "custom":
        return allAssetSnapshotsByAsset({
          onOrAfter: params.onOrAfter as string,
          onOrBefore: params.onOrBefore as string,
        });
      case "last-60":
      default:
        return allAssetSnapshotsByAsset({
          onOrAfter: formatDateOnly(subDays(new Date(), 61)),
        });
    }
  },
  "allAssetSnapshotsForListing",
);
export const route: RouteDefinition = {
  load(args) {
    void getAllAssetSnapshotsForListing(args.location.query);
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
      const [, assetId] = key.split("|");
      return addAssetSnapshot(assetId!, {
        when: pealed.when,
        amount: value,
      });
    }),
  );
}, "addSnapshot");

const editSnapshotAction = action((formData: FormData) => {
  const pealed = pealFormData(formData);
  return editAssetSnapshot(pealed.editingId as string, pealed);
}, "editSnapshot");

function SnapshotDateInput() {
  return (
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
  );
}

function SnapshotAmountInput(props: {
  asset: Asset;
  required?: boolean;
  name: string;
  label: string;
  value?: number;
}) {
  const initValue = untrack(() => props.value);
  const [amount, setAmount] = createSignal(initValue ?? NaN);
  return (
    <FormRowWithId>
      {(id) => (
        <>
          <Label for={id}>{props.label}</Label>
          <div class="group relative">
            <input
              type="text"
              autocomplete="off"
              inputmode="numeric"
              pattern="^\d+(\.\d{0,2})?$"
              class="block w-full"
              id={id}
              value={initValue ?? ""}
              onInput={(event) => setAmount(Number(event.target.value))}
              required={props.required}
              name={props.name}
            />
            <div class="absolute top-0 right-0 opacity-0 transition-opacity duration-300 group-has-focus-within:opacity-100">
              <AssetValuePill assetSnapshot={{ amount: amount() }} asset={props.asset} />
            </div>
          </div>
        </>
      )}
    </FormRowWithId>
  );
}

function CaptureModal(props: { bundles: AssetAndSnapshots[]; onClose: () => void }) {
  return (
    <CrudModal
      action={addSnapshotAction}
      header="Capture Snapshots"
      onClose={props.onClose}
      submitChildren="Capture"
    >
      <SnapshotDateInput />

      <FormRowDivider />

      <For each={props.bundles}>
        {(bundle) => (
          <SnapshotAmountInput
            asset={bundle.asset}
            label={bundle.asset.name}
            name={`multi|${bundle.asset.id}|amount`}
          />
        )}
      </For>
    </CrudModal>
  );
}

function EditModal(props: { asset: Asset; editingSnapshot: AssetSnapshot; onClose: () => void }) {
  return (
    <CrudModal
      onClose={props.onClose}
      header={`Edit "${props.asset.name}" Snapshot`}
      action={editSnapshotAction}
      delete={{
        id: props.editingSnapshot.id,
        confirmingButtonChildren: `Are you sure you want to delete this "${props.asset.name}" snapshot?`,
        action: deleteAssetSnapshotAction,
      }}
    >
      <input name="editingId" type="hidden" value={props.editingSnapshot.id} />

      <SnapshotDateInput />

      <SnapshotAmountInput
        asset={props.asset}
        label="Amount"
        name="amount"
        required
        value={props.editingSnapshot.amount}
      />
    </CrudModal>
  );
}

export default function AssetSnapshots() {
  const [searchParams] = useSearchParams();
  const bundles = createAsync(() => getAllAssetSnapshotsForListing(searchParams));
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(null);
  return (
    <>
      <KbfSiteTitle>Capture Snapshots</KbfSiteTitle>
      <header class="flex items-center justify-between gap-4 pb-8">
        <h1>Capture and Manage Snapshots</h1>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="camera" /> Capture Snapshots
        </Button>
      </header>

      <FilterContainer>
        <TimeFrameFilters timeFrames={[{ value: "last-60", label: "Last 60 Days" }]} />
      </FilterContainer>

      <div class="grid grid-cols-2 gap-8">
        <For each={bundles()}>
          {(assetWithSnapshots) => (
            <div class="space-y-4">
              <h2>{assetWithSnapshots.asset.name}</h2>
              <Table
                class="[&_td]:last:not-only:text-right [&_th]:last:text-right"
                headers={["Date", "Value"]}
                each={assetWithSnapshots.snapshots}
                onRowClick={(snapshot) => {
                  setAddEditModal({ type: "edit", snapshot, asset: assetWithSnapshots.asset });
                }}
              >
                {(assetSnapshot) => [
                  formatDate(assetSnapshot.when),
                  <AssetValuePill assetSnapshot={assetSnapshot} asset={assetWithSnapshots.asset} />,
                ]}
              </Table>
            </div>
          )}
        </For>
      </div>

      <Switch>
        <Match
          when={(() => {
            const state = addEditModal();
            return state?.type === "add" && state;
          })()}
        >
          <CaptureModal bundles={bundles()!} onClose={() => setAddEditModal(null)} />
        </Match>
        <Match
          when={(() => {
            const state = addEditModal();
            return state?.type === "edit" && state;
          })()}
        >
          {(state) => (
            <EditModal
              asset={state().asset}
              editingSnapshot={state().snapshot}
              onClose={() => setAddEditModal(null)}
            />
          )}
        </Match>
      </Switch>
    </>
  );
}
