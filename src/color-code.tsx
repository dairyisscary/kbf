import type { JSX, ComponentProps } from "@solidjs/web";
import { createSignal, For, omit, untrack } from "solid-js";

import { Icon } from "#/icon";

type PipProps = ComponentProps<"span"> & {
  code: number;
  size?: "sm" | "md";
  block?: boolean;
};
type Pillable = { name: string; colorCode: number };
type ColorCodePillProps = { object: Pillable };
type ColorCodeSelectorProps = {
  id: string;
  initColorCode?: number;
  size?: PipProps["size"];
};
type ColorCodePipItemsProps<P extends Pillable> = {
  each: P[];
  children?: (item: P) => JSX.Element;
};

export const MAX_COLOR_CODE = 11;

const SELECTOR = Array.from({ length: MAX_COLOR_CODE + 1 }).map((_, index) => index);

const COLOR_CODE_PILL_CX = "kbf-pill text-lg";

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
  return [
    block ? "flex" : "inline-flex",
    "items-center justify-center rounded-full border border-kbf-dark-purple p-1",
    size === "sm" ? "size-4" : "size-8",
  ];
}

export function ColorCodePip(props: PipProps) {
  const rest = omit(props, "block", "size", "code");
  return (
    <span
      {...rest}
      class={[getPipClass(props.size, props.block), props.class]}
      style={getPipStyle(props.code)}
    />
  );
}

export function ColorCodePillItems(props: { children: JSX.Element }) {
  return <div class="flex flex-wrap items-start gap-2">{props.children}</div>;
}

export function SelectableColorCodePill<T extends Pillable>(props: {
  object: T;
  onClick: (object: T, event: MouseEvent) => void;
  selected: boolean;
}) {
  return (
    <button
      type="button"
      class={[
        COLOR_CODE_PILL_CX,
        "relative ring-0 ring-kbf-text-main transition-[padding] duration-300 aria-pressed:pl-8 aria-pressed:ring-2",
      ]}
      onClick={[props.onClick, props.object]}
      aria-pressed={props.selected ? "true" : "false"}
      style={getPipStyle(props.object.colorCode)}
    >
      <Icon
        name="check-square"
        size="sm"
        class="absolute top-1/2 left-0 -translate-y-1/2 opacity-0 transition-[opacity,left] duration-300 in-aria-pressed:left-2.5 in-aria-pressed:opacity-100"
      />
      {props.object.name}
    </button>
  );
}

export function ColorCodePill(props: ColorCodePillProps) {
  return (
    <span class={COLOR_CODE_PILL_CX} style={getPipStyle(props.object.colorCode)}>
      {props.object.name}
    </span>
  );
}

export function ColorCodeSelector(props: ColorCodeSelectorProps) {
  const [selectedColorCode, setSelectedColorCode] = createSignal(
    untrack(() => props.initColorCode),
  );
  return (
    <>
      <div class="flex flex-wrap gap-2">
        <For each={SELECTOR}>
          {(code) => (
            <button
              type="button"
              class={getPipClass(props.size)}
              style={getPipStyle(code)}
              onClick={[setSelectedColorCode, code]}
              aria-pressed={selectedColorCode() === code ? "true" : "false"}
            >
              <Icon
                name="check"
                class="opacity-0 transition-opacity duration-300 in-aria-pressed:opacity-100"
              />
            </button>
          )}
        </For>
      </div>
      <input type="hidden" name="colorCode" id={props.id} value={selectedColorCode() || ""} />
    </>
  );
}

export function ColorCodePipItems<P extends Pillable>(props: ColorCodePipItemsProps<P>) {
  return (
    <div class="flex flex-wrap items-start gap-5">
      <For each={props.each}>
        {(object) => (
          <span class="inline-flex items-center gap-2 whitespace-nowrap">
            <ColorCodePip code={object.colorCode}>{props.children?.(object)}</ColorCodePip>
            {object.name}
          </span>
        )}
      </For>
    </div>
  );
}
