import type { JSX, ComponentProps } from "@solidjs/web";
import type { CategoryKind } from "kysely-codegen";
import { createSignal, For, untrack } from "solid-js";

import {
  CategoryColorPip,
  CategoryKindIcon,
  CategoryPill,
  SelectableCategoryPill,
} from "#/category/pip";
import { FormRow, NonInteractiveLabel } from "#/form";
import { formatMoneyAmount } from "#/format";

export function AmountPill(props: { transaction: { amount: number; currency: "usd" | "euro" } }) {
  return (
    <span
      class={[
        "kbf-pill font-mono first-letter:pr-0.5",
        props.transaction.amount >= 0
          ? "bg-kbf-action-highlight text-kbf-dark-purple"
          : "bg-kbf-text-accent text-kbf-text-highlight",
      ]}
    >
      {formatMoneyAmount(props.transaction)}
    </span>
  );
}

export function CategoryPillItems(props: { children: JSX.Element }) {
  return <div class="flex flex-wrap items-start gap-2">{props.children}</div>;
}

export function CategoryPipItems(props: {
  categories: { name: string; kind: CategoryKind; colorCode: number }[];
}) {
  return (
    <div class="flex flex-wrap items-start gap-5">
      <For each={props.categories}>
        {(category) => (
          <span class="inline-flex items-center gap-2 whitespace-nowrap">
            <CategoryColorPip code={category.colorCode}>
              <CategoryKindIcon kind={category.kind} size="sm" />
            </CategoryColorPip>
            {category.name}
          </span>
        )}
      </For>
    </div>
  );
}

export function CategorySelectFormRow(props: {
  allCategories: ({ id: string } & ComponentProps<typeof CategoryPill>["category"])[];
  label: JSX.Element;
  name: string;
  initCategories?: { id: string }[];
}) {
  const [selectedCategoryIds, setSelectedCategoryIds] = createSignal(() => {
    const { initCategories } = props;
    if (!initCategories?.length) {
      return [];
    }
    const allCategoryIds = new Set(
      untrack(() => props.allCategories).map((category) => category.id),
    );
    return initCategories.filter((cat) => allCategoryIds.has(cat.id)).map((cat) => cat.id);
  });

  const toggleCategory = ({ id }: { id: string }, event: MouseEvent) => {
    setSelectedCategoryIds((current) => {
      if (event.ctrlKey) {
        return current.includes(id) ? current.filter((c) => c !== id) : current.concat(id);
      }
      return current.includes(id) ? [] : [id];
    });
  };

  return (
    <FormRow>
      <NonInteractiveLabel>{props.label}</NonInteractiveLabel>
      <CategoryPillItems>
        <For each={props.allCategories}>
          {(category) => (
            <SelectableCategoryPill
              category={category}
              onClick={toggleCategory}
              selected={selectedCategoryIds().includes(category.id)}
            />
          )}
        </For>
      </CategoryPillItems>
      <For each={selectedCategoryIds()}>
        {(categoryId) => <input type="hidden" name={props.name} value={categoryId} />}
      </For>
    </FormRow>
  );
}
