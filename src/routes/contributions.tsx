import { action, defineRoute, query, useAction, type RouteProps } from "@solidjs/router";
import { reload } from "@solidjs/web";
import { startOfYear, subDays } from "date-fns";
import { createMemo, createSignal, For, Loading, Show, untrack } from "solid-js";

import { AssetBundle, AssetBundleActionHeader, PhantomAssetBundles } from "#/asset/bundle";
import { AssetValuePill } from "#/asset/pip";
import { Button } from "#/button";
import {
  allContributionsByAsset,
  deleteContribution,
  editContribution,
  addContribution,
} from "#/contribution";
import { FormRowWithId, Label, Legend, pealFormData } from "#/form";
import { CrudModal } from "#/form/crud-modal";
import { StaticCurrencyMoneyInput } from "#/form/money-input";
import { formatDate, formatDateOnly } from "#/format";
import { Icon } from "#/icon";
import { PageTitle } from "#/page-title";
import { FilterContainer, TimeFrameFilters } from "#/query-filters";
import { requireUser } from "#/session";

type AssetAndContributions = Awaited<ReturnType<typeof allContributionsByAsset>>[number];
type Asset = AssetAndContributions["asset"];
type Contribution = AssetAndContributions["contributions"][number];

const getAllContributions = query(async (search: string) => {
  "use server";
  requireUser();
  const params = new URLSearchParams(search);
  switch (params.get("timeFrame")) {
    case "custom":
      return allContributionsByAsset({
        onOrAfter: params.get("onOrAfter"),
        onOrBefore: params.get("onOrBefore"),
      });
    case "year-to-date":
      return allContributionsByAsset({
        onOrAfter: formatDateOnly(startOfYear(new Date())),
      });
    case "last-60":
    default:
      return allContributionsByAsset({
        onOrAfter: formatDateOnly(subDays(new Date(), 61)),
      });
  }
}, "assetContributions");

const deleteContributionAction = action(async (contributionId: string) => {
  "use server";
  requireUser();
  await deleteContribution(contributionId);
  return reload({ revalidate: getAllContributions.key });
});

const addEditAction = action(async (form: FormData) => {
  "use server";
  requireUser();
  const pealed = pealFormData(form);
  await (pealed.isEditingId
    ? editContribution(pealed.isEditingId as string, pealed)
    : addContribution(pealed));
  return reload({ revalidate: getAllContributions.key });
});

export const route = defineRoute({
  preload({ location }) {
    void getAllContributions(location.search);
  },
});

function AssetSelectionInput(props: {
  value: string;
  onInput: (newValue: string) => void;
  assets: Asset[];
}) {
  return (
    <>
      <fieldset class="grid grid-cols-3 gap-4 py-4">
        <Legend>Asset</Legend>
        <For each={props.assets}>
          {(asset) => (
            <button
              type="button"
              class="bg-kbf-light-purple p-4 aria-pressed:bg-kbf-action aria-pressed:text-kbf-text-highlight"
              aria-pressed={asset.id === props.value ? "true" : "false"}
              onClick={[props.onInput, asset.id]}
            >
              {asset.name}
            </button>
          )}
        </For>
      </fieldset>
      <input name="assetId" type="hidden" value={props.value} />
    </>
  );
}

function AddEditModal(props: {
  onClose: () => void;
  bundles: AssetAndContributions[];
  editingContribution: Contribution | undefined;
  initAssetId: string | undefined;
}) {
  const [selectedAssetId, setSelectedAssetId] = createSignal(
    untrack(() => props.initAssetId || props.bundles[0]!.asset.id),
  );
  const selectedAsset = createMemo(() => {
    const assetId = selectedAssetId();
    const bundle = props.bundles.find(({ asset }) => asset.id === assetId);
    return bundle!.asset;
  });

  const deleteAction = useAction(deleteContributionAction);

  const deleteCrud = createMemo(() => {
    if (props.editingContribution) {
      const { id } = props.editingContribution;
      return {
        on: () => deleteAction(id),
        confirmingButtonChildren: "Are you sure you want to delete this contribution?",
      };
    }
    return undefined;
  });

  return (
    <CrudModal
      action={addEditAction}
      delete={deleteCrud()}
      header={`${props.editingContribution ? "Edit" : "Add"} Contribution`}
      onClose={props.onClose}
    >
      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>Amount</Label>
            <StaticCurrencyMoneyInput
              required
              name="amount"
              allowNegative={false}
              id={id}
              initAmount={props.editingContribution?.amount}
              currency={selectedAsset().currency}
            />
          </>
        )}
      </FormRowWithId>

      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>When</Label>
            <input
              id={id}
              type="date"
              autocomplete="off"
              name="when"
              required
              value={props.editingContribution?.when || formatDateOnly(new Date())}
            />
          </>
        )}
      </FormRowWithId>

      <AssetSelectionInput
        assets={props.bundles.map((bundle) => bundle.asset)}
        onInput={setSelectedAssetId}
        value={selectedAssetId()}
      />

      <input name="isEditingId" type="hidden" value={props.editingContribution?.id || ""} />
    </CrudModal>
  );
}

export default function Contributions(props: RouteProps<typeof route>) {
  const bundles = createMemo(() => getAllContributions(props.location.search));

  type ModalState =
    | null
    | { type: "add"; contribution?: never; initAssetId?: string }
    | { type: "edit"; contribution?: Contribution; initAssetId: string };
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(null);

  return (
    <>
      <header class="flex items-center justify-between gap-4 pb-8">
        <PageTitle icon="life-buoy">Manage Contributions</PageTitle>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="plus" /> Record Contribution
        </Button>
      </header>

      <FilterContainer>
        <TimeFrameFilters
          timeFrames={[
            { value: "last-60", label: "Last 60 Days" },
            { value: "year-to-date", label: "This Year" },
          ]}
        />
      </FilterContainer>

      <div class="grid grid-cols-2 gap-x-8 gap-y-32">
        <Loading fallback={<PhantomAssetBundles bundles={bundles()} />}>
          <For each={bundles()}>
            {(assetWithContributions) => (
              <AssetBundle
                title={
                  <AssetBundleActionHeader
                    icon="plus"
                    onClick={() => {
                      setAddEditModal({
                        type: "add",
                        initAssetId: assetWithContributions.asset.id,
                      });
                    }}
                  >
                    {assetWithContributions.asset.name}
                  </AssetBundleActionHeader>
                }
                each={assetWithContributions.contributions}
                onRowClick={(contribution) => {
                  setAddEditModal({
                    type: "edit",
                    contribution,
                    initAssetId: assetWithContributions.asset.id,
                  });
                }}
              >
                {(contribution) => [
                  <span class="font-mono">{formatDate(contribution.when)}</span>,
                  <AssetValuePill object={contribution} asset={assetWithContributions.asset} />,
                ]}
              </AssetBundle>
            )}
          </For>
        </Loading>
      </div>

      <Show when={addEditModal()}>
        {(modalState) => (
          <AddEditModal
            onClose={() => setAddEditModal(null)}
            editingContribution={modalState().contribution}
            initAssetId={modalState().initAssetId}
            bundles={bundles()}
          />
        )}
      </Show>
    </>
  );
}
