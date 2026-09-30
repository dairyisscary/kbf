import { action, defineRoute, query, useAction, type RouteProps } from "@solidjs/router";
import { reload } from "@solidjs/web";
import { subDays } from "date-fns";
import { createSignal, createMemo, Switch, Match, For, Loading } from "solid-js";

import {
  allAssetSnapshotsByAsset,
  addAssetSnapshot,
  deleteAssetSnapshot,
  editAssetSnapshot,
} from "#/asset-snapshot";
import { AssetBundle, AssetBundleActionHeader, PhantomAssetBundles } from "#/asset/bundle";
import { AssetValuePill } from "#/asset/pip";
import { Button } from "#/button";
import { pealFormData, FormRowWithId, Label, FormRowDivider } from "#/form";
import { CrudModal } from "#/form/crud-modal";
import { StaticCurrencyMoneyInput } from "#/form/money-input";
import { formatDate, formatDateOnly } from "#/format";
import { Icon } from "#/icon";
import { PageTitle } from "#/page-title";
import { FilterContainer, TimeFrameFilters } from "#/query-filters";
import { requireUser } from "#/session";

type AssetAndSnapshots = Awaited<ReturnType<typeof allAssetSnapshotsByAsset>>[number];
type Asset = AssetAndSnapshots["asset"];
type AssetSnapshot = AssetAndSnapshots["snapshots"][number];

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

function CaptureModal(props: {
  initAssetFocusId: string | undefined;
  bundles: AssetAndSnapshots[];
  onClose: () => void;
}) {
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
          <FormRowWithId>
            {(id) => (
              <>
                <Label for={id}>{bundle.asset.name}</Label>
                <StaticCurrencyMoneyInput
                  autofocus={bundle.asset.id === props.initAssetFocusId}
                  allowNegative={false}
                  currency={bundle.asset.currency}
                  id={id}
                  name={`multi|${bundle.asset.id}|amount`}
                />
              </>
            )}
          </FormRowWithId>
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

      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>Amount</Label>
            <StaticCurrencyMoneyInput
              allowNegative={false}
              required
              name="amount"
              currency={props.asset.currency}
              id={id}
              initAmount={props.editingSnapshot.amount}
            />
          </>
        )}
      </FormRowWithId>
    </CrudModal>
  );
}

export const route = defineRoute({
  preload({ location }) {
    void getAllAssetSnapshotsForListing(location.search);
  },
});

export default function AssetSnapshots(props: RouteProps<typeof route>) {
  const bundles = createMemo(() => getAllAssetSnapshotsForListing(props.location.search));

  type ModalState =
    | null
    | { type: "add"; snapshot?: never; initAssetFocusId?: string }
    | { type: "edit"; snapshot: AssetSnapshot; asset: Asset };
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(null);

  return (
    <>
      <header class="flex items-center justify-between gap-4 pb-8">
        <PageTitle icon="trending-up">Manage Snapshots</PageTitle>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="git-merge" /> Capture Snapshots
        </Button>
      </header>

      <FilterContainer>
        <TimeFrameFilters timeFrames={[{ value: "last-60", label: "Last 60 Days" }]} />
      </FilterContainer>

      <div class="grid grid-cols-2 gap-x-8 gap-y-32">
        <Loading fallback={<PhantomAssetBundles bundles={bundles()} />}>
          <For each={bundles()}>
            {(assetWithSnapshots) => (
              <AssetBundle
                title={
                  <AssetBundleActionHeader
                    icon="plus"
                    onClick={() => {
                      setAddEditModal({
                        type: "add",
                        initAssetFocusId: assetWithSnapshots.asset.id,
                      });
                    }}
                  >
                    {assetWithSnapshots.asset.name}
                  </AssetBundleActionHeader>
                }
                each={assetWithSnapshots.snapshots}
                onRowClick={(snapshot) => {
                  setAddEditModal({ type: "edit", snapshot, asset: assetWithSnapshots.asset });
                }}
              >
                {(assetSnapshot) => [
                  <span class="font-mono">{formatDate(assetSnapshot.when)}</span>,
                  <AssetValuePill object={assetSnapshot} asset={assetWithSnapshots.asset} />,
                ]}
              </AssetBundle>
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
          {(state) => (
            <CaptureModal
              bundles={bundles()}
              onClose={() => setAddEditModal(null)}
              initAssetFocusId={state().initAssetFocusId}
            />
          )}
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
