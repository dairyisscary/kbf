import RootStyles from "~/root-wrapper.module.css";
import { formatMoneyAmount } from "~/format";
import clx from "~/clx";

export function AssetValuePill(props: {
  assetSnapshot: {
    amount: number;
    kind: { currency: "usd" | "euro"; taxAdvantaged: boolean };
  };
}) {
  return (
    <span
      class={clx(
        "font-mono first-letter:pr-0.5",
        RootStyles.pill,
        props.assetSnapshot.kind.taxAdvantaged
          ? "bg-kbf-text-accent text-kbf-text-highlight"
          : "bg-kbf-action-highlight text-kbf-dark-purple",
      )}
    >
      {formatMoneyAmount({
        amount: props.assetSnapshot.amount,
        currency: props.assetSnapshot.kind.currency,
      })}
    </span>
  );
}
