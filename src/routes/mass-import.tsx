import { action, defineRoute, query, useSubmissions } from "@solidjs/router";
import { createSignal, createMemo, Show, Loading } from "solid-js";

import { Alert } from "#/alert";
import { Button } from "#/button";
import { allCategoriesByName } from "#/category";
import {
  pealFormData,
  FormFooter,
  FormRow,
  FormRowWithId,
  Label,
  NonInteractiveLabel,
} from "#/form";
import { formatCurrencySign, formatPlural } from "#/format";
import { KbfSiteTitle } from "#/meta";
import { requireUser } from "#/session";
import { massImport } from "#/transaction";
import { CategorySelectFormRow } from "#/transaction/pip";

const getAllCategories = query(async () => {
  "use server";
  requireUser();
  return allCategoriesByName({ excludeArchived: true });
}, "categoriesNoArchived");

const massImportAction = action((formData: FormData) => {
  "use server";
  requireUser();
  return massImport(pealFormData(formData, ["categoryIds"]));
});

export const route = defineRoute({
  preload() {
    void getAllCategories();
  },
});

export default function MassImport() {
  const allCategories = createMemo(() => getAllCategories());

  const [selectedCategories, setSelectedCategories] = createSignal([]);

  const [currency, setCurrency] = createSignal<Parameters<typeof formatCurrencySign>[0]>("usd");
  let formRef: HTMLFormElement | undefined; // oxlint-disable-line no-unassigned-vars
  massImportAction.onSettled((submission) => {
    if (!submission.error) {
      formRef!.reset();
      setCurrency("usd");
      setSelectedCategories([]); // reset the key
    }
  });

  const submissions = useSubmissions(massImportAction);
  const latestSubmission = createMemo(() => submissions.at(-1));

  return (
    <>
      <KbfSiteTitle>Mass Import</KbfSiteTitle>
      <h1>Mass Import</h1>
      <form method="post" action={massImportAction} ref={formRef}>
        <Loading>
          <Show when={latestSubmission()?.error}>
            {(error) => <Alert class="mt-6">{error().message}</Alert>}
          </Show>

          <FormRowWithId>
            {(id) => (
              <>
                <Label for={id}>Comma-Separated Values</Label>
                <textarea class="min-h-[200px]" id={id} name="csv" required />
              </>
            )}
          </FormRowWithId>

          <FormRow>
            <NonInteractiveLabel>Currency Type</NonInteractiveLabel>
            <div>
              <Button
                class="text-xl"
                onClick={() => setCurrency((c) => (c === "euro" ? "usd" : "euro"))}
              >
                {formatCurrencySign(currency())}
              </Button>
            </div>
            <input type="hidden" name="currency" value={currency()} />
          </FormRow>

          <CategorySelectFormRow
            initCategories={selectedCategories()}
            allCategories={allCategories().filter((c) => c.kind === "payment")}
            name="categoryIds"
            label="Payment"
          />

          <CategorySelectFormRow
            initCategories={selectedCategories()}
            allCategories={allCategories().filter((c) => c.kind === "basic")}
            name="categoryIds"
            label="Categories"
          />

          <FormFooter>
            <div
              class={[
                "transition-opacity duration-300",
                !latestSubmission()?.result && "opacity-0",
              ]}
            >
              <Show keyed when={latestSubmission()?.result}>
                {(result) =>
                  `Inserted ${formatPlural(result.insertedCount, "new transaction")} -- skipped ${formatPlural(result.skippedCount, "duplicate transaction")}.`
                }
              </Show>
            </div>
            <Button type="submit">Import</Button>
          </FormFooter>
        </Loading>
      </form>
    </>
  );
}
