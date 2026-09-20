import type { JSX, ComponentProps } from "@solidjs/web";
import type { CategoryKind } from "kysely-codegen";
import { createSignal, For, untrack } from "solid-js";

import { CategoryKindIcon } from "#/category/pip";
import {
  ColorCodePill,
  ColorCodePillItems,
  ColorCodePipItems,
  SelectableColorCodePill,
} from "#/color-code";
import { FormRow, NonInteractiveLabel } from "#/form";

export function CategoryPipItems(props: {
  categories: { name: string; kind: CategoryKind; colorCode: number }[];
}) {
  return (
    <ColorCodePipItems each={props.categories}>
      {(category) => <CategoryKindIcon kind={category.kind} size="sm" />}
    </ColorCodePipItems>
  );
}

export function CategorySelectFormRow(props: {
  allCategories: ({ id: string } & ComponentProps<typeof ColorCodePill>["object"])[];
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
      <ColorCodePillItems>
        <For each={props.allCategories}>
          {(category) => (
            <SelectableColorCodePill
              object={category}
              onClick={toggleCategory}
              selected={selectedCategoryIds().includes(category.id)}
            />
          )}
        </For>
      </ColorCodePillItems>
      <For each={selectedCategoryIds()}>
        {(categoryId) => <input type="hidden" name={props.name} value={categoryId} />}
      </For>
    </FormRow>
  );
}
