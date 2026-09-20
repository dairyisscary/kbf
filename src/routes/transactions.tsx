import {
  action,
  defineRoute,
  query,
  useAction,
  useSearchParams,
  type RouteProps,
} from "@solidjs/router";
import { reload, type JSX } from "@solidjs/web";
import { subDays, startOfMonth, subMonths, endOfMonth } from "date-fns";
import { createSignal, createMemo, For, Show, Loading, onSettled, createStore } from "solid-js";

import { Button } from "#/button";
import { allCategoriesByName } from "#/category";
import { ColorCodePill } from "#/color-code";
import { pealFormData, Checkbox, FormRowWithId, Label } from "#/form";
import { CrudModal } from "#/form/crud-modal";
import { MoneyInput } from "#/form/money-input";
import { AmountPill, formatDate, formatDateOnly, formatDateForInput, formatPlural } from "#/format";
import { Icon } from "#/icon";
import { KbfSiteTitle } from "#/meta";
import { FilterButton, FilterContainer, TimeFrameFilters } from "#/query-filters";
import { requireUser } from "#/session";
import { Table } from "#/table";
import {
  allTransactionsFromFilters,
  addTransaction,
  editTransaction,
  deleteTransaction,
} from "#/transaction";
import { CategoryPipItems, CategorySelectFormRow } from "#/transaction/pip";

type Transaction = Awaited<ReturnType<typeof allTransactionsFromFilters>>[number];
type Category = Awaited<ReturnType<typeof allCategoriesByName>>[number];

const addEditAction = action(async (form: FormData) => {
  "use server";
  requireUser();
  const pealed = pealFormData(form, ["categoryIds"]);
  await (pealed.isEditingId
    ? editTransaction(pealed.isEditingId as string, pealed)
    : addTransaction(pealed));
  return reload({ revalidate: getTransactionsForListing.key });
});

const deleteTransactionAction = action(async (transactionId: string) => {
  "use server";
  requireUser();
  await deleteTransaction(transactionId);
  return reload({ revalidate: getTransactionsForListing.key });
});

const getAllCategories = query(async () => {
  "use server";
  requireUser();
  return allCategoriesByName();
}, "categories");

const getTransactionsForListing = query(async (search: string) => {
  "use server";
  requireUser();
  const params = new URLSearchParams(search);
  const categoryIds = params.get("filterCategoryIds")?.split(",");
  switch (params.get("timeFrame")) {
    case "custom":
      return allTransactionsFromFilters({
        onOrAfter: params.get("onOrAfter"),
        onOrBefore: params.get("onOrBefore"),
        categoryIds,
      });
    case "last-month": {
      const firstOfLastMonth = startOfMonth(subMonths(new Date(), 1));
      return allTransactionsFromFilters({
        onOrAfter: formatDateOnly(firstOfLastMonth),
        onOrBefore: formatDateOnly(endOfMonth(firstOfLastMonth)),
        categoryIds,
      });
    }
    case "last-60":
    default:
      return allTransactionsFromFilters({
        onOrAfter: formatDateOnly(subDays(new Date(), 61)),
        categoryIds,
      });
  }
}, "transactionsWithFilter");

function FilterCategoryPopup(props: { onClose: () => void; children: JSX.Element }) {
  let wrapperRef: HTMLDivElement | undefined; // oxlint-disable-line no-unassigned-vars
  onSettled(() => {
    const clickCallback = (event: Event) => {
      if (wrapperRef && !wrapperRef.contains(event.target as Node)) {
        props.onClose();
      }
    };
    const keyCallback = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        props.onClose();
      }
    };
    document.addEventListener("click", clickCallback);
    document.addEventListener("keydown", keyCallback);
    return () => {
      document.removeEventListener("keydown", keyCallback);
      document.removeEventListener("click", clickCallback);
    };
  });
  return (
    <div
      ref={wrapperRef}
      class="absolute top-full right-0 z-10 mt-2 grid h-[400px] w-[700px] grid-cols-2 gap-2 overflow-y-auto rounded-sm border border-kbf-action bg-kbf-light-purple p-4"
    >
      {props.children}
    </div>
  );
}

function AddEditModal(props: {
  onClose: () => void;
  allCategories: Category[];
  editingTransaction: undefined | Transaction;
}) {
  const selectableCategories = createMemo(() => {
    const editingTransactionCategoryIds = props.editingTransaction?.categories.map((c) => c.id);
    return props.allCategories.filter((category) => {
      return !category.archived || editingTransactionCategoryIds?.includes(category.id);
    });
  });

  const deleteAction = useAction(deleteTransactionAction);

  const deleteCrud = createMemo(() => {
    if (props.editingTransaction) {
      const { id, description } = props.editingTransaction;
      return {
        on: () => deleteAction(id),
        confirmingButtonChildren: `Are you sure you want to delete the "${description}" transaction?`,
      };
    }
    return undefined;
  });

  return (
    <CrudModal
      action={addEditAction}
      delete={deleteCrud()}
      header={`${props.editingTransaction ? "Edit" : "Add"} Transaction`}
      onClose={props.onClose}
    >
      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>Description</Label>
            <input
              id={id}
              type="text"
              name="description"
              autocomplete="off"
              value={props.editingTransaction?.description || ""}
              required
            />
          </>
        )}
      </FormRowWithId>

      <FormRowWithId>
        {(id) => (
          <>
            <Label for={id}>Amount</Label>
            <MoneyInput
              id={id}
              allowNegative
              initAmount={props.editingTransaction?.amount}
              initCurrency={props.editingTransaction?.currency}
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
              value={formatDateForInput(props.editingTransaction?.when)}
              required
            />
          </>
        )}
      </FormRowWithId>

      <CategorySelectFormRow
        allCategories={selectableCategories().filter((c) => c.kind === "payment")}
        initCategories={props.editingTransaction?.categories}
        name="categoryIds"
        label="Payment"
      />

      <CategorySelectFormRow
        allCategories={selectableCategories().filter((c) => c.kind === "basic")}
        initCategories={props.editingTransaction?.categories}
        name="categoryIds"
        label="Categories"
      />

      <input name="isEditingId" type="hidden" value={props.editingTransaction?.id || ""} />
    </CrudModal>
  );
}

function Filters(props: { allCategories: Category[] }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filterCategoriesOpen, setFilterCategoriesOpen] = createSignal(false);
  const filterCategories = createMemo(
    () => (searchParams.filterCategoryIds as string | undefined)?.split(",") || [],
  );

  return (
    <FilterContainer>
      <TimeFrameFilters
        timeFrames={[
          { value: "last-60", label: "Last 60 Days" },
          { value: "last-month", label: "Last Month" },
        ]}
      />
      <div class="relative ml-auto">
        <FilterButton pressed={false} onClick={() => setFilterCategoriesOpen((o) => !o)}>
          {filterCategories().length
            ? `(${filterCategories().length.toString()}) Selected Categories`
            : "Categories"}
        </FilterButton>
        <Show when={filterCategoriesOpen()}>
          <FilterCategoryPopup onClose={() => setFilterCategoriesOpen(false)}>
            <For each={props.allCategories}>
              {(category) => (
                <div>
                  <Checkbox
                    checked={filterCategories().includes(category.id)}
                    name={category.id}
                    id={`filter-${category.id}`}
                    onInput={() => {
                      const current = filterCategories();
                      const without = current.filter((item) => item !== category.id);
                      const newValue =
                        without.length === current.length ? without.concat(category.id) : without;
                      setSearchParams({ filterCategoryIds: newValue.join(",") });
                    }}
                  >
                    <ColorCodePill object={category} />
                  </Checkbox>
                </div>
              )}
            </For>
          </FilterCategoryPopup>
        </Show>
      </div>
    </FilterContainer>
  );
}

function transactionSum(transactions: Transaction[], currency: Transaction["currency"]): number {
  return transactions.reduce((accum, transaction) => {
    return transaction.currency === currency ? accum + transaction.amount : accum;
  }, 0);
}

export const route = defineRoute({
  preload({ location }) {
    void getAllCategories();
    void getTransactionsForListing(location.search);
  },
});

export default function Transactions(props: RouteProps<typeof route>) {
  const [transactions] = createStore(() => getTransactionsForListing(props.location.search), []);
  const categories = createMemo(() => getAllCategories());

  type ModalState =
    | false
    | { type: "add"; transaction?: never }
    | { type: "edit"; transaction: Transaction };
  const [addEditModal, setAddEditModal] = createSignal<ModalState>(false);

  return (
    <>
      <KbfSiteTitle>Manage Transactions</KbfSiteTitle>
      <header class="flex items-center justify-between gap-4 pb-8">
        <h1>Manage Transactions</h1>
        <Button onClick={() => setAddEditModal({ type: "add" })}>
          <Icon name="plus" /> Add Transaction
        </Button>
      </header>
      <Filters allCategories={categories()} />
      <Table
        class="mb-16 [&_td]:first:not-only:w-0 [&_td]:first:not-only:font-mono [&_td]:first:not-only:whitespace-nowrap [&_td]:last:not-only:text-right [&_th]:first:not-only:min-w-fit [&_th]:last:text-right"
        headers={["Date", "Description", "Categories", "Amount"]}
        each={transactions}
        onRowClick={(transaction) => {
          setAddEditModal({ type: "edit", transaction });
        }}
      >
        {(transaction) => [
          formatDate(transaction.when),
          <span class="break-all text-kbf-text-highlight">{transaction.description}</span>,
          <CategoryPipItems categories={transaction.categories} />,
          <AmountPill object={transaction} />,
        ]}
      </Table>
      <Loading>
        <footer class="fixed bottom-0 left-0 flex w-full items-center justify-center gap-4 border-t border-kbf-action bg-kbf-light-purple p-6 text-lg">
          <p>Showing {formatPlural(transactions.length, "transaction")}</p>
          <AmountPill object={{ currency: "euro", amount: transactionSum(transactions, "euro") }} />
          <AmountPill object={{ currency: "usd", amount: transactionSum(transactions, "usd") }} />
        </footer>
      </Loading>
      <Show when={addEditModal()}>
        {(modalState) => (
          <AddEditModal
            onClose={() => setAddEditModal(false)}
            editingTransaction={modalState().transaction}
            allCategories={categories()}
          />
        )}
      </Show>
    </>
  );
}
