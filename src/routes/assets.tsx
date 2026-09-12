import { action, defineRoute, query, useAction } from "@solidjs/router";
import { reload } from "@solidjs/web";
import { createSignal, createMemo, Show, untrack } from "solid-js";

import { addAsset, editAsset, deleteAsset, allAssets } from "#/asset";
import { Button } from "#/button";
import { pealFormData, Checkbox, FormRowWithId, Label } from "#/form";
import { CrudModal } from "#/form/crud-modal";
import { formatCurrencySign } from "#/format";
import { Icon } from "#/icon";
import { KbfSiteTitle } from "#/meta";
import { requireUser } from "#/session";
import { Table } from "#/table";

type Asset = Awaited<ReturnType<typeof allAssets>>[number];
type ModalState = false | { type: "add"; asset?: never } | { type: "edit"; asset: Asset };

const getAllAssets = query(async () => {
  "use server";
  requireUser();
  return allAssets();
}, "assets");

const addEditAssetAction = action(async (formData: FormData) => {
  "use server";
  requireUser();
  const pealed = pealFormData(formData);
  await (pealed.isEditingId ? editAsset(pealed.isEditingId as string, pealed) : addAsset(pealed));
  return reload({ revalidate: getAllAssets.key });
});

const deleteAssetAction = action(async (id: string) => {
  "use server";
  requireUser();
  await deleteAsset(id);
  return reload({ revalidate: getAllAssets.key });
});

function AddEditModal(props: { onClose: () => void; editingAsset?: Asset }) {
  const [currency, setCurrency] = createSignal<Asset["currency"]>(
    untrack(() => props.editingAsset?.currency) || "usd",
  );

  const deleteAction = useAction(deleteAssetAction);
  const deleteCrud = createMemo(() => {
    if (props.editingAsset) {
      const { id, name } = props.editingAsset;
      return {
        on: () => deleteAction(id),
        confirmingButtonChildren: (
          <>
            Are you <strong class="text-kbf-action">really</strong> sure you want to delete the "
            {name}" asset?
          </>
        ),
      };
    }
    return undefined;
  });

  return (
    <CrudModal
      action={addEditAssetAction}
      header={`${props.editingAsset ? "Edit" : "Add"} Asset`}
      delete={deleteCrud()}
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
              value={props.editingAsset?.name || ""}
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
          <Checkbox name="taxAdvantaged" checked={props.editingAsset?.taxAdvantaged} id={id}>
            Asset is Tax Advantaged
          </Checkbox>
        )}
      </FormRowWithId>

      <input name="isEditingId" type="hidden" value={props.editingAsset?.id || ""} />
    </CrudModal>
  );
}

export const route = defineRoute({
  preload() {
    void getAllAssets();
  },
});

export default function Assets() {
  const assets = createMemo(() => getAllAssets());
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(false);
  return (
    <>
      <KbfSiteTitle>Manage Assets</KbfSiteTitle>
      <header class="flex items-center justify-between gap-4 pb-8">
        <h1>Manage Assets</h1>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="plus" /> Add Asset
        </Button>
      </header>
      <Table
        headers={["Name", "Currency", "Tax Advantaged"]}
        each={assets()}
        onRowClick={(asset) => {
          setAddEditModal({ type: "edit", asset });
        }}
      >
        {(asset) => [
          <span class="text-kbf-text-highlight">{asset.name}</span>,
          <span class="uppercase">{asset.currency}</span>,
          <Icon
            name={asset.taxAdvantaged ? "check-circle" : "circle"}
            class={asset.taxAdvantaged ? "text-kbf-action-highlight" : "text-kbf-text-accent"}
          />,
        ]}
      </Table>
      <Show when={addEditModal()}>
        {(modalState) => (
          <AddEditModal onClose={() => setAddEditModal(false)} editingAsset={modalState().asset} />
        )}
      </Show>
    </>
  );
}
