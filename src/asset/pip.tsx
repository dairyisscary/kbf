import { formatMoneyAmount } from "#/format";

export function AssetValuePill(props: {
  object: { amount: number };
  asset: { currency: "usd" | "euro" };
}) {
  return (
    <span class="kbf-pill bg-kbf-action-highlight font-mono text-kbf-dark-purple first-letter:pr-0.5">
      {formatMoneyAmount({
        amount: props.object.amount,
        currency: props.asset.currency,
      })}
    </span>
  );
}
