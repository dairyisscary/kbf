import { createEffect, createSignal, Show } from "solid-js";
import { useRouteData, Title } from "solid-start";
import { createServerData$, createServerAction$ } from "solid-start/server";

import { formatCurrencySign } from "~/format";
import { massImport } from "~/transaction";
import { CategorySelectFormRow } from "~/transaction/pip";
import { allCategoriesByName } from "~/category";
import { pealFormData, FormFooter, FormRow, Checkbox, FormRowWithId, Label } from "~/form";
import { getDocumentTitle } from "~/root";
import Alert from "~/alert";
import clx from "~/clx";
import Button from "~/button";

export function routeData() {
  return createServerData$(() => allCategoriesByName());
}

export default function MassImport() {
  const allCategories = useRouteData<typeof routeData>();
  const [currency, setCurrency] = createSignal<Parameters<typeof formatCurrencySign>[0]>("euro");
  const [submitting, { Form }] = createServerAction$((form: FormData) => {
    const pealed = pealFormData(form, ["categoryIds"]);
    return massImport(pealed);
  });
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
      <Title>{getDocumentTitle("Mass Import")}</Title>
      <h1>Mass Import</h1>
      <Form ref={formRef}>
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
              `Inserted ${submitting.result.insertedCount} new transaction(s) -- skipped ${submitting.result.skippedCount} duplicate transaction(s).`}
          </div>
          <Button type="submit">Import</Button>
        </FormFooter>
      </Form>
    </>
  );
}
