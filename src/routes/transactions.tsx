import {
  createSignal,
  onCleanup,
  createMemo,
  createEffect,
  For,
  Show,
  type ComponentProps,
  type JSX,
} from "solid-js";
import {
  createAsync,
  cache,
  action,
  useAction,
  useSearchParams,
  type RouteDefinition,
} from "@solidjs/router";
import { subDays, startOfMonth, subMonths, endOfMonth, format } from "date-fns";

import { KbfSiteTitle } from "~/app";
import {
  allTransactionsFromFilters,
  addTransaction,
  editTransaction,
  deleteTransaction,
} from "~/transaction";
import { allCategoriesByName } from "~/category";
import { pealFormData, Checkbox, FormFooter, FormRowWithId, Label } from "~/form";
import { ConfirmingDeleteButton } from "~/form/confirm";
import { useClearingSubmission } from "~/form/submission";
import Table from "~/table";
import Button from "~/button";
import Modal from "~/modal";
import Icon from "~/icon";
import Alert from "~/alert";
import clx from "~/clx";
import { formatDate, formatDateForInput, formatCurrencySign } from "~/format";
import { AmountPill, CategoryItems, CategorySelectFormRow } from "~/transaction/pip";
import { CategoryPill } from "~/category/pip";

import Styles from "./transactions.module.css";

type Transaction = Awaited<ReturnType<typeof allTransactionsFromFilters>>[number];
type Category = Awaited<ReturnType<typeof allCategoriesByName>>[number];
type TimeFrame = "last-60" | "custom" | "last-month";
type ModalState =
  | false
  | { type: "add"; transaction?: undefined }
  | { type: "edit"; transaction: Transaction };

function smallIsoFormat(date: Date) {
  return format(date, "yyyy-MM-dd");
}

const getTransactionsForListing = cache((params: Record<string, string[] | string | undefined>) => {
  const categoryIds = (params.filterCategoryIds as string | undefined)?.split(",");
  switch (params.timeFrame) {
    case "custom":
      return allTransactionsFromFilters({
        onOrAfter: params.onOrAfter as string,
        onOrBefore: params.onOrBefore as string,
        categoryIds,
      });
    case "last-month": {
      const firstOfLastMonth = startOfMonth(subMonths(new Date(), 1));
      return allTransactionsFromFilters({
        onOrAfter: smallIsoFormat(firstOfLastMonth),
        onOrBefore: smallIsoFormat(endOfMonth(firstOfLastMonth)),
        categoryIds,
      });
    }
    case "last-60":
    default:
      return allTransactionsFromFilters({
        onOrAfter: smallIsoFormat(subDays(new Date(), 61)),
        categoryIds,
      });
  }
}, "transactionsForListing");

const addEditAction = action((form: FormData) => {
  const pealed = pealFormData(form, ["categoryIds"]);
  return pealed.isEditingId
    ? editTransaction(pealed.isEditingId as string, pealed)
    : addTransaction(pealed);
}, "addEditTransaction");

const getAllCategories = cache(allCategoriesByName, "categoriesForTransactions");

export const route: RouteDefinition = {
  load(args) {
    void getAllCategories();
    void getTransactionsForListing(args.location.query);
  },
};

function transactionSum(
  transactions: Transaction[] | undefined,
  currency: Transaction["currency"],
): number {
  if (!transactions) {
    return 0;
  }
  return transactions.reduce((accum, transaction) => {
    return transaction.currency === currency ? accum + transaction.amount : accum;
  }, 0);
}

const deleteTransactionAction = action(deleteTransaction, "deleteTransaction");

function FilterCategoryPopup(props: { onClose: () => void; children: JSX.Element }) {
  return (
    <div
      ref={(ref) => {
        const clickCallback = (event: Event) => {
          if (!ref.contains(event.target as Node)) {
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
        onCleanup(() => {
          document.removeEventListener("click", clickCallback);
          document.removeEventListener("keydown", keyCallback);
        });
      }}
      class="absolute right-0 top-full z-10 mt-2 grid h-[400px] w-[700px] grid-cols-2 gap-2 overflow-y-auto rounded border border-kbf-action bg-kbf-light-purple p-4"
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
  const [amountFormat, setAmountFormat] = createSignal<number>(
    props.editingTransaction?.amount ?? NaN,
  );
  const [currency, setCurrency] = createSignal<Parameters<typeof formatCurrencySign>[0]>(
    props.editingTransaction?.currency || "usd",
  );

  const submitting = useClearingSubmission(addEditAction);

  const doDelete = useAction(deleteTransactionAction);
  const deleting = useClearingSubmission(deleteTransactionAction);

  createEffect(() => {
    if (submitting.result || deleting.result) {
      props.onClose();
    }
  });

  return (
    <Modal onClose={props.onClose}>
      <h1>{props.editingTransaction ? "Edit" : "Add"} Transaction</h1>
      <form method="post" action={addEditAction}>
        <Show when={submitting.error as null | Error}>
          {(error) => <Alert class="mt-6">{error().message}</Alert>}
        </Show>
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
              <div class={clx(Styles.amountrow, "relative flex gap-3")}>
                <Button
                  class="aspect-square text-xl"
                  onClick={() => setCurrency((c) => (c === "euro" ? "usd" : "euro"))}
                >
                  {formatCurrencySign(currency())}
                </Button>
                <input type="hidden" name="currency" value={currency()} />
                <input
                  id={id}
                  autocomplete="off"
                  class="w-full flex-1"
                  type="text"
                  name="amount"
                  inputmode="numeric"
                  pattern="-?[0-9]+(\.[0-9]{0,2})?"
                  value={props.editingTransaction?.amount || ""}
                  required
                  onInput={(event) => setAmountFormat(Number(event.target.value))}
                />
                <div
                  class={clx(
                    Styles.formatamount,
                    "absolute right-0 top-0 transition-opacity duration-300",
                  )}
                >
                  <AmountPill transaction={{ currency: currency(), amount: amountFormat() }} />
                </div>
              </div>
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
          allCategories={props.allCategories}
          initCategories={props.editingTransaction?.categories}
          name="categoryIds"
        />

        <input name="isEditingId" type="hidden" value={props.editingTransaction?.id || ""} />

        <FormFooter>
          <Show when={props.editingTransaction}>
            {(transaction) => (
              <ConfirmingDeleteButton
                onDelete={() => {
                  void doDelete(transaction().id);
                }}
              >
                Are you sure you want to delete this transaction?
              </ConfirmingDeleteButton>
            )}
          </Show>
          <Button onclick={props.onClose} class="ml-auto" variant="cancel">
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </FormFooter>
      </form>
    </Modal>
  );
}

function CategoriesCell(props: { categories: ComponentProps<typeof CategoryPill>["category"][] }) {
  return (
    <CategoryItems>
      <For each={props.categories}>{(category) => <CategoryPill category={category} />}</For>
    </CategoryItems>
  );
}

function Filters(props: { allCategories: Category[] | undefined }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const timeFrame = () => searchParams.timeFrame || "last-60";
  const [customOpen, setCustomOpen] = createSignal(timeFrame() === "custom");
  const isNonCustomTimeFrameSelected = (check: Exclude<TimeFrame, "custom">) =>
    !customOpen() && timeFrame() === check;
  const setTimeFrameClosed = (timeFrame: TimeFrame) => {
    setCustomOpen(false);
    setSearchParams({ timeFrame });
  };

  const [filterCategoriesOpen, setFilterCategoriesOpen] = createSignal(false);
  const filterCategories = createMemo(
    () => (searchParams.filterCategoryIds as string | undefined)?.split(",") || [],
  );
  return (
    <div class={Styles.filters}>
      <Button
        variant="cancel"
        class={clx(isNonCustomTimeFrameSelected("last-60") && Styles.activefilter)}
        onClick={[setTimeFrameClosed, "last-60"]}
      >
        Last 60 Days
      </Button>
      <Button
        variant="cancel"
        class={clx(isNonCustomTimeFrameSelected("last-month") && Styles.activefilter)}
        onClick={[setTimeFrameClosed, "last-month"]}
      >
        Last Month
      </Button>
      <Button
        variant="cancel"
        class={clx(customOpen() && Styles.activefilter)}
        onClick={() => {
          setCustomOpen(true);
          if (searchParams.onOrAfter || searchParams.onOrBefore) {
            setSearchParams({ timeFrame: "custom" });
          }
        }}
      >
        Custom
      </Button>
      <div
        class={clx(
          "transition-opacity duration-300 md:flex-row",
          !customOpen() && "pointer-events-none opacity-0",
        )}
      >
        {" --> "}
      </div>
      <div
        class={clx(
          "flex flex-col items-center gap-2 transition-opacity duration-300 md:flex-row",
          !customOpen() && "pointer-events-none opacity-0",
        )}
      >
        <input
          type="date"
          autocomplete="off"
          name="onOrAfter"
          tabIndex={customOpen() ? undefined : -1}
          value={searchParams.onOrAfter}
          onChange={(event) => {
            setSearchParams({ timeFrame: "custom", onOrAfter: event.target.value });
          }}
        />
        <input
          type="date"
          autocomplete="off"
          name="onOrBefore"
          tabIndex={customOpen() ? undefined : -1}
          value={searchParams.onOrBefore}
          onChange={(event) => {
            setSearchParams({ timeFrame: "custom", onOrBefore: event.target.value });
          }}
        />
      </div>
      <div class="relative ml-auto">
        <Button variant="cancel" class="" onClick={() => setFilterCategoriesOpen((o) => !o)}>
          {filterCategories().length
            ? `(${filterCategories().length.toString()}) Selected Categories`
            : "Categories"}
        </Button>
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
                    <CategoryPill category={category} />
                  </Checkbox>
                </div>
              )}
            </For>
          </FilterCategoryPopup>
        </Show>
      </div>
    </div>
  );
}

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const transactions = createAsync(() => getTransactionsForListing(searchParams));
  const allCategories = createAsync(() => getAllCategories());
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
      <Filters allCategories={allCategories()} />
      <Table
        class={Styles.table}
        headers={["Date", "Description", "Categories", "Amount"]}
        each={transactions()}
        onRowClick={(transaction) => {
          setAddEditModal({ type: "edit", transaction });
        }}
      >
        {(transaction) => [
          formatDate(transaction.when),
          <span class="break-all text-kbf-text-highlight">{transaction.description}</span>,
          <CategoriesCell categories={transaction.categories} />,
          <AmountPill transaction={transaction} />,
        ]}
      </Table>
      <Show when={addEditModal()}>
        {(modalState) => (
          <AddEditModal
            onClose={() => setAddEditModal(false)}
            editingTransaction={modalState().transaction}
            allCategories={allCategories()!}
          />
        )}
      </Show>
      <footer class="fixed bottom-0 left-0 flex w-full items-center justify-center gap-4 border-t border-kbf-action bg-kbf-light-purple p-6 text-lg">
        <p>Showing {transactions()?.length || 0} transaction(s)</p>
        <AmountPill
          transaction={{ currency: "euro", amount: transactionSum(transactions(), "euro") }}
        />
        <AmountPill
          transaction={{ currency: "usd", amount: transactionSum(transactions(), "usd") }}
        />
      </footer>
    </>
  );
}
