import { splitProps, Show, For, type ComponentProps } from "solid-js";
import { Dynamic } from "solid-js/web";

import clx from "~/clx";
import Icon from "~/icon";
import RootStyles from "~/root-wrapper.module.css";

import Styles from "./pip.module.css";

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
  const [fgColorType, backgroundHex] = getColorsForCode(code);
  return `background-color:${backgroundHex};color:${
    fgColorType === "light" ? "#FEFEFE" : "#17153A"
  }`;
}

function getPipClass(size?: PipProps["size"], block?: boolean) {
  return clx(
    block ? "flex" : "inline-flex",
    "items-center justify-center rounded-full",
    size === "sm" ? "h-4 w-4" : "h-8 w-8",
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
          >
            <Icon name="check" class={clx(Styles.pip, props.value === code && Styles.pipsel)} />
          </button>
        )}
      </For>
    </div>
  );
}

export function CategoryPill<C extends { name: string; colorCode: number }>(props: {
  onClick?: (category: C, event: MouseEvent) => void;
  category: C;
  class?: string;
  selected?: boolean | null | undefined;
}) {
  return (
    <Dynamic
      component={props.onClick ? "button" : "span"}
      type={props.onClick && "button"}
      onClick={props.onClick && [props.onClick, props.category]}
      class={clx(RootStyles.pill, "text-lg")}
      style={getPipStyle(props.category.colorCode)}
    >
      <span class={clx(Styles.pill, props.selected && Styles.pillsel)}>
        <Show when={props.onClick}>
          <Icon name="check-square" />
        </Show>
        {props.category.name}
      </span>
    </Dynamic>
  );
}
