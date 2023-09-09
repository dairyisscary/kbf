type Currency = "usd" | "euro";

const EURO_FORMATTER = new Intl.NumberFormat("nl-NL", { currency: "EUR", style: "currency" });
const USD_FORMATTER = new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" });
const DISPLAY_DATE_FORMATTERS = [
  new Intl.DateTimeFormat("en", { day: "2-digit" }),
  new Intl.DateTimeFormat("en", { month: "short" }),
  new Intl.DateTimeFormat("en", { year: "numeric" }),
] as const;

export function formatDate(value: string | null | undefined): string | null {
  if (value) {
    const date = new Date(value); // XXX users timezone is different between server and client?
    return DISPLAY_DATE_FORMATTERS.map((f) => f.format(date)).join(" ");
  }
  return null;
}

export function formatDateForInput(value: string | null | undefined): string | undefined {
  return value || undefined;
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
