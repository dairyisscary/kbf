import { createEffect, createSignal, Show } from "solid-js";
import { action, cache, createAsync, useSubmission, type RouteDefinition } from "@solidjs/router";

import { formatCurrencySign } from "~/format";
import { massImport } from "~/transaction";
import { CategorySelectFormRow } from "~/transaction/pip";
import { allCategoriesByName } from "~/category";
import { pealFormData, FormFooter, FormRow, Checkbox, FormRowWithId, Label } from "~/form";
import { KbfSiteTitle } from "~/app";
import Alert from "~/alert";
import clx from "~/clx";
import Button from "~/button";

const getAllCategories = cache(allCategoriesByName, "categoriesForMassImport");

export const route: RouteDefinition = {
  load() {
    void getAllCategories();
  },
};

const massImportAction = action((formData: FormData) => {
  return massImport(pealFormData(formData, ["categoryIds"]));
}, "massImport");

export default function MassImport() {
  const allCategories = createAsync(() => getAllCategories());
  const [currency, setCurrency] = createSignal<Parameters<typeof formatCurrencySign>[0]>("euro");
  const submitting = useSubmission(massImportAction);
  let formRef: undefined | HTMLFormElement;
  const reset = () => Boolean(submitting.result && !submitting.error);
  createEffect(() => {
    if (reset()) {
      formRef!.reset();
      setCurrency("euro");
    }
  });
  return (
    <>
      <KbfSiteTitle>Mass Import</KbfSiteTitle>
      <h1>Mass Import</h1>
      <form method="post" action={massImportAction} ref={formRef}>
        <Show when={submitting.error as null | Error}>
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
          <Label>Currency Type</Label>
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
          reset={reset()}
          allCategories={allCategories() || []}
          name="categoryIds"
          label="Mass Tag Categories"
        />

        <FormRowWithId>
          {(id) => (
            <Checkbox name="invertAmounts" id={id}>
              Invert Amounts in CSV (TD Bank lists debits as positive values)
            </Checkbox>
          )}
        </FormRowWithId>

        <FormFooter>
          <div class={clx("transition-opacity duration-300", !submitting.result && "opacity-0")}>
            {submitting.result &&
              `Inserted ${submitting.result.insertedCount.toString()} new transaction(s) -- skipped ${submitting.result.skippedCount.toString()} duplicate transaction(s).`}
          </div>
          <Button type="submit">Import</Button>
        </FormFooter>
      </form>
    </>
  );
}
