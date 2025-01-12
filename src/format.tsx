import { format } from "date-fns";

import { localizeDate } from "~/date";

type Currency = "usd" | "euro";

const EURO_FORMATTER = new Intl.NumberFormat("nl-NL", { currency: "EUR", style: "currency" });
const USD_FORMATTER = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" });
const DISPLAY_DATE_FORMATTERS = [
  new Intl.DateTimeFormat("en-US", { day: "2-digit" }),
  new Intl.DateTimeFormat("en-US", { month: "short" }),
  new Intl.DateTimeFormat("en-US", { year: "numeric" }),
] as const;

export function formatDate(value: string | null | undefined): string | null {
  if (value) {
    const date = localizeDate(value);
    return DISPLAY_DATE_FORMATTERS.map((f) => f.format(date)).join(" ");
  }
  return null;
}

export function formatDateForInput(value: string | null | undefined): string | undefined {
  return value || undefined;
}

export function formatDateOnly(value: Date) {
  return format(value, "yyyy-MM-dd");
}

export function formatMoneyAmount(
  value: { currency: Currency; amount: number } | undefined | null,
) {
  if (!value) {
    return null;
  }
  const rawValue =
    value.currency === "euro"
      ? EURO_FORMATTER.format(value.amount)
      : USD_FORMATTER.format(value.amount);
  return rawValue.replace(/[^\d,.$€]/g, "");
}

export function formatCurrencySign(currency: Currency): string {
  return currency === "euro" ? "€" : "$";
}
