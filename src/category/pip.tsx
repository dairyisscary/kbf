import { splitProps, For, type ComponentProps } from "solid-js";

import clx from "~/clx";
import Icon from "~/icon";

type PipProps = ComponentProps<"span"> & {
  code: number;
  size?: "sm" | "md";
  block?: boolean;
};
type SelectorProps = {
  onChange: (newValue: number) => void;
  value: number | undefined | null;
  size?: PipProps["size"];
};
type PillableCategory = { name: string; colorCode: number };
type CategoryPillProps<C extends PillableCategory> = {
  category: C;
};

const SELECTOR = Array.from({ length: 12 }).map((_, index) => index);

export function getColorsForCode(
  code: number,
): [foregroundType: "light" | "dark", backgroundHex: string] {
  switch (code) {
    case 0:
      return ["dark", "#DBBEA1"];
    case 1:
      return ["light", "#5FAD56"];
    case 2:
      return ["dark", "#7BE0AD"];
    case 3:
      return ["dark", "#4ECDC4"];
    case 4:
      return ["light", "#CC444D"];
    case 5:
      return ["light", "#127475"];
    case 6:
      return ["dark", "#F2C14E"];
    case 7:
      return ["light", "#A30D79"];
    case 8:
      return ["light", "#7F557D"];
    case 9:
      return ["light", "#554640"];
    case 10:
      return ["light", "#FF6B6B"];
    case 11:
      return ["dark", "#CDE6F5"];
    default: // uncategorized or unknown
      return ["light", "#707078"];
  }
}

function getPipStyle(code: number) {
  const [foregroundColorType, backgroundValue] = getColorsForCode(code);
  const foregroundValue = foregroundColorType === "light" ? "#FEFEFE" : "#17153A";
  return `background-color:${backgroundValue};color:${foregroundValue}`;
}

function getPipClass(size?: PipProps["size"], block?: boolean) {
  return clx(
    block ? "flex" : "inline-flex",
    "items-center justify-center rounded-full",
    size === "sm" ? "size-4" : "size-8",
  );
}

export function CategoryColorPip(props: PipProps) {
  const [local, rest] = splitProps(props, ["class", "block", "size", "code"]);
  return (
    <span
      {...rest}
      class={clx(getPipClass(local.size, local.block), local.class)}
      style={getPipStyle(local.code)}
    />
  );
}

export function CategoryColorSelector(props: SelectorProps) {
  return (
    <div class="flex flex-wrap gap-2">
      <For each={SELECTOR}>
        {(code) => (
          <button
            type="button"
            class={getPipClass(props.size)}
            style={getPipStyle(code)}
            onClick={[props.onChange, code]}
            aria-pressed={props.value === code}
          >
            <Icon
              name="check"
              class="opacity-0 transition-opacity duration-300 in-aria-pressed:opacity-100"
            />
          </button>
        )}
      </For>
    </div>
  );
}

const CATEGORY_PILL_CX = "kbf-pill text-lg";

export function SelectableCategoryPill<C extends PillableCategory>(
  props: CategoryPillProps<C> & {
    onClick: (category: C, event: MouseEvent) => void;
    selected: boolean;
  },
) {
  return (
    <button
      type="button"
      class={clx(
        CATEGORY_PILL_CX,
        "relative ring-0 ring-kbf-text-main transition-[padding] duration-300 aria-pressed:pl-8 aria-pressed:ring-2",
      )}
      onClick={[props.onClick, props.category]}
      aria-pressed={props.selected}
      style={getPipStyle(props.category.colorCode)}
    >
      <Icon
        name="check-square"
        size="sm"
        class="absolute top-1/2 left-0 -translate-y-1/2 opacity-0 transition-[opacity,left] duration-300 in-aria-pressed:left-2.5 in-aria-pressed:opacity-100"
      />
      {props.category.name}
    </button>
  );
}

export function CategoryPill<C extends PillableCategory>(props: CategoryPillProps<C>) {
  return (
    <span class={CATEGORY_PILL_CX} style={getPipStyle(props.category.colorCode)}>
      {props.category.name}
    </span>
  );
}
