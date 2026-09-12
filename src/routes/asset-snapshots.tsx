import { action, defineRoute, query, useAction, type RouteProps } from "@solidjs/router";
import { reload, type JSX } from "@solidjs/web";
import { subDays } from "date-fns";
import { createSignal, createMemo, Switch, Match, For, untrack, Loading } from "solid-js";

import {
  allAssetSnapshotsByAsset,
  addAssetSnapshot,
  deleteAssetSnapshot,
  editAssetSnapshot,
} from "#/asset-snapshot";
import { AssetValuePill } from "#/asset-snapshot/pip";
import { Button } from "#/button";
import { pealFormData, FormRowWithId, Label, FormRowDivider } from "#/form";
import { CrudModal } from "#/form/crud-modal";
import { formatDate, formatDateOnly } from "#/format";
import { Icon } from "#/icon";
import { KbfSiteTitle } from "#/meta";
import { PhantomText } from "#/phantom";
import { FilterContainer, TimeFrameFilters } from "#/query-filters";
import { requireUser } from "#/session";
import { Table } from "#/table";

type AssetAndSnapshots = Awaited<ReturnType<typeof allAssetSnapshotsByAsset>>[number];
type Asset = AssetAndSnapshots["asset"];
type AssetSnapshot = AssetAndSnapshots["snapshots"][number];
type ModalState =
  | null
  | { type: "add"; snapshot?: never }
  | { type: "edit"; snapshot: AssetSnapshot; asset: Asset };

const getAllAssetSnapshotsForListing = query(async (search: string) => {
  "use server";
  requireUser();
  const params = new URLSearchParams(search);
  switch (params.get("timeFrame")) {
    case "custom":
      return allAssetSnapshotsByAsset({
        onOrAfter: params.get("onOrAfter"),
        onOrBefore: params.get("onOrBefore"),
      });
    case "last-60":
    default:
      return allAssetSnapshotsByAsset({
        onOrAfter: formatDateOnly(subDays(new Date(), 61)),
      });
  }
}, "assetSnapshots");

const deleteAssetSnapshotAction = action(async (id: string) => {
  "use server";
  requireUser();
  await deleteAssetSnapshot(id);
  return reload({ revalidate: getAllAssetSnapshotsForListing.key });
});

const addSnapshotAction = action(async (formData: FormData) => {
  "use server";
  requireUser();
  const pealed = pealFormData(formData);
  await Promise.all(
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
  return reload({ revalidate: getAllAssetSnapshotsForListing.key });
});

const editSnapshotAction = action(async (formData: FormData) => {
  "use server";
  requireUser();
  const pealed = pealFormData(formData);
  await editAssetSnapshot(pealed.editingId as string, pealed);
  return reload({ revalidate: getAllAssetSnapshotsForListing.key });
});

function SnapshotDateInput(props: { value?: string }) {
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
            value={props.value || formatDateOnly(new Date())}
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
  const deleteAction = useAction(deleteAssetSnapshotAction);
  const deleteCrud = createMemo(() => {
    if (props.editingSnapshot) {
      const { id } = props.editingSnapshot;
      return {
        on: () => deleteAction(id),
        confirmingButtonChildren: `Are you sure you want to delete this "${props.asset.name}" snapshot?`,
      };
    }
    return undefined;
  });

  return (
    <CrudModal
      onClose={props.onClose}
      header={`Edit "${props.asset.name}" Snapshot`}
      action={editSnapshotAction}
      delete={deleteCrud()}
    >
      <input name="editingId" type="hidden" value={props.editingSnapshot.id} />

      <SnapshotDateInput value={props.editingSnapshot.when} />

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

function Bundle<T>(props: {
  title: JSX.Element;
  onRowClick?: (item: T) => void;
  each: T[];
  children: (item: T) => JSX.Element[];
}) {
  return (
    <div class="space-y-4">
      <h2>{props.title}</h2>
      <Table
        class="[&_td]:last:not-only:text-right [&_th]:last:text-right"
        headers={["Date", "Value"]}
        each={props.each}
        phantomRowCount={3}
        onRowClick={props.onRowClick}
      >
        {props.children}
      </Table>
    </div>
  );
}

const noCells = () => [];

function PhantomBundles(props: { bundles: unknown[] }) {
  return (
    <For each={Array.from({ length: 4 })}>
      {() => (
        <Bundle each={props.bundles} title={<PhantomText />}>
          {noCells}
        </Bundle>
      )}
    </For>
  );
}

export const route = defineRoute({
  preload({ location }) {
    void getAllAssetSnapshotsForListing(location.search);
  },
});

export default function AssetSnapshots(props: RouteProps<typeof route>) {
  const bundles = createMemo(() => getAllAssetSnapshotsForListing(props.location.search));
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
        <Loading fallback={<PhantomBundles bundles={bundles()} />}>
          <For each={bundles()}>
            {(assetWithSnapshots) => (
              <Bundle
                title={assetWithSnapshots.asset.name}
                each={assetWithSnapshots.snapshots}
                onRowClick={(snapshot) => {
                  setAddEditModal({ type: "edit", snapshot, asset: assetWithSnapshots.asset });
                }}
              >
                {(assetSnapshot) => [
                  formatDate(assetSnapshot.when),
                  <AssetValuePill assetSnapshot={assetSnapshot} asset={assetWithSnapshots.asset} />,
                ]}
              </Bundle>
            )}
          </For>
        </Loading>
      </div>

      <Switch>
        <Match
          when={(() => {
            const state = addEditModal();
            return state?.type === "add" && state;
          })()}
        >
          <CaptureModal bundles={bundles()} onClose={() => setAddEditModal(null)} />
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
