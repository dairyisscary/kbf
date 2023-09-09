import { For, type JSX } from "solid-js";

import clx from "~/clx";

type Props<V> = {
  value: V;
  items: { label: JSX.Element; value: V }[];
  onChange: (newValue: V, event: Event) => void;
  class?: string;
};

export default function TabGroup<V>(props: Props<V>) {
  return (
    <div class={clx("inline-flex items-stretch rounded-md bg-kbf-light-purple", props.class)}>
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            class={clx(
              "flex-1 px-2 py-1 text-sm",
              item.value === props.value && "bg-kbf-action text-kbf-text-highlight",
            )}
            onClick={[props.onChange, item.value]}
          >
            {item.label}
          </button>
        )}
      </For>
    </div>
  );
}
