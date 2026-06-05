import { useSearchParams } from "@solidjs/router";
import {
  createMemo,
  createSignal,
  For,
  untrack,
  type ComponentProps,
  type JSXElement,
} from "solid-js";

import Button from "~/button";
import clx from "~/clx";

type OnClick = ComponentProps<typeof Button>["onClick"];

const FILTER_CONTROL_CX = "border! px-3 py-2 text-sm";
const FILTER_INPUT_CX = clx(FILTER_CONTROL_CX, "bg-kbf-dark-purple");

export function FilterContainer(props: { children: JSXElement }) {
  return <div class="mb-7 flex items-center gap-3">{props.children}</div>;
}

export function FilterButton(props: { pressed: boolean; children: JSXElement; onClick: OnClick }) {
  return (
    <Button
      variant="cancel"
      class={FILTER_CONTROL_CX}
      aria-pressed={props.pressed}
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}

export function TimeFrameFilters(props: { timeFrames: { value: string; label: string }[] }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTimeFrame = createMemo(
    () => (searchParams.timeFrame as string | undefined) || props.timeFrames[0]!.value,
  );

  const [customOpen, setCustomOpen] = createSignal(untrack(() => currentTimeFrame() === "custom"));

  const handleNonCustomClick = (timeFrame: string) => {
    setCustomOpen(false);
    setSearchParams({ timeFrame });
  };

  return (
    <>
      <For each={props.timeFrames}>
        {(timeFrame) => (
          <FilterButton
            pressed={!customOpen() && currentTimeFrame() === timeFrame.value}
            onClick={[handleNonCustomClick, timeFrame.value]}
          >
            {timeFrame.label}
          </FilterButton>
        )}
      </For>
      <FilterButton
        pressed={customOpen()}
        onClick={() => {
          setCustomOpen(true);
          if (searchParams.onOrAfter || searchParams.onOrBefore) {
            setSearchParams({ timeFrame: "custom" });
          }
        }}
      >
        Custom
      </FilterButton>
      <div
        aria-hidden="true"
        class={clx(
          "transition-opacity duration-300 md:flex-row",
          !customOpen() && "pointer-events-none opacity-0",
        )}
      >
        {" --> "}
      </div>
      <div
        class={clx(
          "flex flex-col items-center gap-2 transition-opacity duration-300 md:flex-row",
          !customOpen() && "pointer-events-none opacity-0",
        )}
      >
        <input
          type="date"
          autocomplete="off"
          name="onOrAfter"
          class={FILTER_INPUT_CX}
          tabIndex={customOpen() ? undefined : -1}
          value={searchParams.onOrAfter}
          onChange={(event) => {
            setSearchParams({ timeFrame: "custom", onOrAfter: event.target.value });
          }}
        />
        <input
          type="date"
          autocomplete="off"
          name="onOrBefore"
          class={FILTER_INPUT_CX}
          tabIndex={customOpen() ? undefined : -1}
          value={searchParams.onOrBefore}
          onChange={(event) => {
            setSearchParams({ timeFrame: "custom", onOrBefore: event.target.value });
          }}
        />
      </div>
    </>
  );
}
