import { action, defineRoute, query, useAction, type RouteProps } from "@solidjs/router";
import { reload } from "@solidjs/web";
import { subDays, startOfMonth, subMonths, endOfMonth } from "date-fns";
import { createSignal, createMemo, Show, Loading, For } from "solid-js";

import { Button } from "#/button";
import { ColorCodePillItems, ColorCodePipItems, SelectableColorCodePill } from "#/color-code";
import { pealFormData, FormRowWithId, Label, FormRow, NonInteractiveLabel } from "#/form";
import { CrudModal } from "#/form/crud-modal";
import { MoneyInput } from "#/form/money-input";
import { formatDate, formatDateOnly, formatPlural, formatMoneyAmount, AmountPill } from "#/format";
import { Icon } from "#/icon";
import { KbfSiteTitle } from "#/meta";
import { allNuggetsFromFilters, addNugget, editNugget, deleteNugget } from "#/nugget";
import { allNuggetTagsByName } from "#/nugget-tag";
import { FilterContainer, TimeFrameFilters } from "#/query-filters";
import { requireUser } from "#/session";
import { Table } from "#/table";

type Nugget = Awaited<ReturnType<typeof allNuggetsFromFilters>>[number];
type NuggetTag = Awaited<ReturnType<typeof allNuggetTagsByName>>[number];

const addEditAction = action(async (form: FormData) => {
  "use server";
  requireUser();
  const pealed = pealFormData(form, ["tagIds"]);
  await (pealed.isEditingId ? editNugget(pealed.isEditingId as string, pealed) : addNugget(pealed));
  return reload({ revalidate: getNuggets.key });
});

const deleteNuggetAction = action(async (nuggetId: string) => {
  "use server";
  requireUser();
  await deleteNugget(nuggetId);
  return reload({ revalidate: getNuggets.key });
});

const getNuggetTags = query(async () => {
  "use server";
  requireUser();
  return allNuggetTagsByName();
}, "nuggetTagsForNuggets");

const getNuggets = query(async (search: string) => {
  "use server";
  requireUser();
  const params = new URLSearchParams(search);
  switch (params.get("timeFrame")) {
    case "custom":
      return allNuggetsFromFilters({
        onOrAfter: params.get("onOrAfter"),
        onOrBefore: params.get("onOrBefore"),
      });
    case "last-month": {
      const firstOfLastMonth = startOfMonth(subMonths(new Date(), 1));
      return allNuggetsFromFilters({
        onOrAfter: formatDateOnly(firstOfLastMonth),
        onOrBefore: formatDateOnly(endOfMonth(firstOfLastMonth)),
      });
    }
    case "last-60":
    default:
      return allNuggetsFromFilters({
        onOrAfter: formatDateOnly(subDays(new Date(), 61)),
      });
  }
}, "nuggetsWithFilter");

function AddEditModal(props: {
  onClose: () => void;
  editingNugget: Nugget | undefined;
  allNuggetTags: NuggetTag[];
}) {
  const [selectedNuggetTagIds, setSelectedNuggetTagIds] = createSignal(() => {
    const initTags = props.editingNugget?.tags.map((t) => t.id) || [];
    const allTagIds = new Set(props.allNuggetTags.map((nuggetTag) => nuggetTag.id));
    return initTags.filter((nuggetTagId) => allTagIds.has(nuggetTagId));
  });

  const toggleCategory = ({ id: nuggetId }: { id: string }) => {
    setSelectedNuggetTagIds((current) => {
      return current.includes(nuggetId)
        ? current.filter((id) => id !== nuggetId)
        : current.concat(nuggetId);
    });
  };

  const deleteAction = useAction(deleteNuggetAction);
  const deleteCrud = createMemo(() => {
    if (props.editingNugget) {
      const { id, currency, amount } = props.editingNugget;
      return {
        on: () => deleteAction(id),
        confirmingButtonChildren: `Are you sure you want to delete the "${formatMoneyAmount({ currency, amount })}" nugget?`,
      };
    }
    return undefined;
  });

  return (
    <CrudModal
      action={addEditAction}
      delete={deleteCrud()}
      header={`${props.editingNugget ? "Edit" : "Add"} Nugget`}
      onClose={props.onClose}
    >
      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>Amount</Label>
            <MoneyInput
              id={id}
              allowNegative={false}
              initAmount={props.editingNugget?.amount}
              initCurrency={props.editingNugget?.currency}
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
              value={props.editingNugget?.when || formatDateOnly(new Date())}
              required
            />
          </>
        )}
      </FormRowWithId>

      <FormRow>
        <NonInteractiveLabel>Tags</NonInteractiveLabel>
        <ColorCodePillItems>
          <For each={props.allNuggetTags}>
            {(nuggetTag) => (
              <SelectableColorCodePill
                object={nuggetTag}
                onClick={toggleCategory}
                selected={selectedNuggetTagIds().includes(nuggetTag.id)}
              />
            )}
          </For>
        </ColorCodePillItems>
        <For each={selectedNuggetTagIds()}>
          {(nuggetTagId) => <input type="hidden" name="tagIds" value={nuggetTagId} />}
        </For>
      </FormRow>

      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>Note (optional)</Label>
            <input
              id={id}
              type="text"
              name="note"
              autocomplete="off"
              value={props.editingNugget?.note || ""}
            />
          </>
        )}
      </FormRowWithId>

      <input name="isEditingId" type="hidden" value={props.editingNugget?.id || ""} />
    </CrudModal>
  );
}

function Filters() {
  return (
    <FilterContainer>
      <TimeFrameFilters
        timeFrames={[
          { value: "last-60", label: "Last 60 Days" },
          { value: "last-month", label: "Last Month" },
        ]}
      />
    </FilterContainer>
  );
}

function nuggetSum(nuggets: Nugget[], currency: Nugget["currency"]): number {
  return nuggets.reduce((accum, nugget) => {
    return nugget.currency === currency ? accum + nugget.amount : accum;
  }, 0);
}

export const route = defineRoute({
  preload({ location }) {
    void getNuggetTags();
    void getNuggets(location.search);
  },
});

export default function Nuggets(props: RouteProps<typeof route>) {
  const nuggets = createMemo(() => getNuggets(props.location.search));
  const nuggetTags = createMemo(() => getNuggetTags());

  type ModalState = false | { type: "add"; nugget?: never } | { type: "edit"; nugget: Nugget };
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(false);

  return (
    <>
      <KbfSiteTitle>Manage Nuggets</KbfSiteTitle>
      <header class="flex items-center justify-between gap-4 pb-8">
        <h1>Manage Nuggets</h1>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="plus" /> Add Nugget
        </Button>
      </header>
      <Filters />
      <Table
        class="mb-16 [&_td]:first:not-only:w-0 [&_td]:first:not-only:font-mono [&_td]:first:not-only:whitespace-nowrap [&_td]:last:not-only:text-right [&_th]:first:not-only:min-w-fit [&_th]:last:text-right"
        headers={["Date", "Note", "Tags", "Amount"]}
        each={nuggets()}
        onRowClick={(nugget) => {
          setAddEditModal({ type: "edit", nugget });
        }}
      >
        {(nugget) => [
          formatDate(nugget.when),
          <span class={nugget.note ? "break-all text-kbf-text-highlight" : undefined}>
            {nugget.note || "—"}
          </span>,
          <ColorCodePipItems each={nugget.tags} />,
          <AmountPill object={nugget} />,
        ]}
      </Table>
      <Loading>
        <footer class="fixed bottom-0 left-0 flex w-full items-center justify-center gap-4 border-t border-kbf-action bg-kbf-light-purple p-6 text-lg">
          <p>Showing {formatPlural(nuggets().length, "nugget")}</p>
          <AmountPill object={{ currency: "euro", amount: nuggetSum(nuggets(), "euro") }} />
          <AmountPill object={{ currency: "usd", amount: nuggetSum(nuggets(), "usd") }} />
        </footer>
      </Loading>
      <Show when={addEditModal()}>
        {(modalState) => (
          <AddEditModal
            onClose={() => setAddEditModal(false)}
            editingNugget={modalState().nugget}
            allNuggetTags={nuggetTags()}
          />
        )}
      </Show>
    </>
  );
}
