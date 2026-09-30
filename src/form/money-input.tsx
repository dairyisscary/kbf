import { createSignal, untrack } from "solid-js";

import { Button } from "#/button";
import { AmountPill, formatCurrencySign } from "#/format";

type InputProps = {
  initAmount?: number;
  autofocus?: boolean;
  currency: "euro" | "usd";
  required?: boolean;
  id: string;
  name: string;
  allowNegative: boolean;
};

type MoneyInputProps = Omit<InputProps, "currency"> & {
  initCurrency?: "euro" | "usd";
};

const PATTERN = "^\\d+(\\.\\d{0,2})?$";
const NEGATIVE_PATTERN = `^-?${PATTERN.slice(1)}`;

function Input(props: InputProps) {
  const initAmount = untrack(() => props.initAmount);
  const [amountFormat, setAmountFormat] = createSignal<number>(initAmount ?? NaN);
  return (
    <>
      <input
        type="text"
        class="block w-full flex-1"
        autocomplete="off"
        inputmode="numeric"
        autofocus={props.autofocus}
        id={props.id}
        name={props.name}
        pattern={props.allowNegative ? NEGATIVE_PATTERN : PATTERN}
        value={initAmount ?? ""}
        required={props.required}
        onInput={({ target: { value } }) => setAmountFormat(value ? Number(value) : NaN)}
      />
      <div class="absolute top-0 right-0 opacity-0 transition-opacity duration-300 group-has-focus-within:opacity-100">
        <AmountPill object={{ currency: props.currency, amount: amountFormat() }} />
      </div>
    </>
  );
}

export function MoneyInput(props: MoneyInputProps) {
  const [currency, setCurrency] = createSignal<Parameters<typeof formatCurrencySign>[0]>(
    untrack(() => props.initCurrency) || "usd",
  );
  return (
    <div class="group relative flex gap-3">
      <Button
        class="aspect-square text-xl"
        onClick={() => setCurrency((c) => (c === "euro" ? "usd" : "euro"))}
      >
        {formatCurrencySign(currency())}
      </Button>
      <input type="hidden" name="currency" value={currency()} />
      <Input
        required={props.required}
        name={props.name}
        id={props.id}
        currency={currency()}
        allowNegative={props.allowNegative}
        initAmount={props.initAmount}
      />
    </div>
  );
}

export function StaticCurrencyMoneyInput(props: InputProps) {
  return (
    <div class="group relative">
      <Input {...props} />
    </div>
  );
}
