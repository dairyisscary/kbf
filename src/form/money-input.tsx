import { createSignal, untrack } from "solid-js";

import { Button } from "#/button";
import { AmountPill, formatCurrencySign } from "#/format";

type Props = {
  initAmount?: number;
  initCurrency?: "euro" | "usd";
  id: string;
  allowNegative: boolean;
};

const PATTERN = "^\\d+(\\.\\d{0,2})?$";
const NEGATIVE_PATTERN = `^-?${PATTERN.slice(1)}`;

export function MoneyInput(props: Props) {
  const initAmount = untrack(() => props.initAmount);
  const [amountFormat, setAmountFormat] = createSignal<number>(initAmount ?? NaN);
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
      <input
        id={props.id}
        autocomplete="off"
        class="w-full flex-1"
        type="text"
        name="amount"
        inputmode="numeric"
        pattern={props.allowNegative ? NEGATIVE_PATTERN : PATTERN}
        value={initAmount ?? ""}
        required
        onInput={({ target: { value } }) => setAmountFormat(value ? Number(value) : NaN)}
      />
      <div class="absolute top-0 right-0 opacity-0 transition-opacity duration-300 group-has-focus-within:opacity-100">
        <AmountPill object={{ currency: currency(), amount: amountFormat() }} />
      </div>
    </div>
  );
}
