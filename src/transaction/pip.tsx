import { createSignal, For, createEffect, type JSX, type ComponentProps } from "solid-js";

import { formatMoneyAmount } from "~/format";
import clx from "~/clx";
import RootStyles from "~/root-wrapper.module.css";
import { FormRow, Label } from "~/form";
import { CategoryPill } from "~/category/pip";

export function AmountPill(props: { transaction: { amount: number; currency: "usd" | "euro" } }) {
  return (
    <span
      class={clx(
        "font-mono first-letter:pr-0.5",
        RootStyles.pill,
        props.transaction.amount >= 0
          ? "bg-kbf-action-highlight text-kbf-dark-purple"
          : "bg-kbf-text-accent text-kbf-text-highlight",
      )}
    >
      {formatMoneyAmount(props.transaction)}
    </span>
  );
}

export function CategoryItems(props: { children: JSX.Element }) {
  return <div class="flex flex-wrap items-start gap-2">{props.children}</div>;
}

function getInitSelectionIds(
  allCategories: { id: string }[],
  initCategoryIds: { id: string }[] | undefined,
): string[] {
  if (!initCategoryIds) {
    return [];
  }
  // Never include a selected category that's not an option.
  const allCategoryIds = new Set(allCategories.map((category) => category.id));
  return initCategoryIds.filter((cat) => allCategoryIds.has(cat.id)).map((cat) => cat.id);
}

export function CategorySelectFormRow(props: {
  allCategories: ({ id: string } & ComponentProps<typeof CategoryPill>["category"])[];
  reset?: boolean;
  label?: JSX.Element;
  name: string;
  initCategories?: { id: string }[];
}) {
  const [selectedCategoryIds, setSelectedCategoryIds] = createSignal(
    getInitSelectionIds(props.allCategories, props.initCategories),
  );
  const toggleCategory = ({ id }: { id: string }) => {
    setSelectedCategoryIds((current) => {
      return current.includes(id) ? current.filter((c) => c !== id) : current.concat(id);
    });
  };

  if (props.reset !== undefined) {
    createEffect(() => {
      if (props.reset) {
        setSelectedCategoryIds(getInitSelectionIds(props.allCategories, props.initCategories));
      }
    });
  }

  return (
    <FormRow>
      <Label>{props.label || "Categories"}</Label>
      <CategoryItems>
        <For each={props.allCategories}>
          {(category) => (
            <CategoryPill
              category={category}
              onClick={toggleCategory}
              selected={selectedCategoryIds().includes(category.id)}
            />
          )}
        </For>
      </CategoryItems>
      <For each={selectedCategoryIds()}>
        {(categoryId) => <input type="hidden" name={props.name} value={categoryId} />}
      </For>
    </FormRow>
  );
}
