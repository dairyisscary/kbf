import { For, type JSX } from "solid-js";

import clx from "~/clx";

type Props<T> = {
  class?: string;
  headers: JSX.Element[];
  each: T[] | null | undefined;
  onRowClick?: (item: T, event: MouseEvent) => void;
  children: (item: T) => JSX.Element[];
};

const TD_CX = "transition-colors duration-300 first:rounded-l last:rounded-r";
const MAIN_TD_CX = clx(
  TD_CX,
  "text-lg",
  "group-hover/tr-action:cursor-pointer group-hover/tr-action:bg-kbf-action-alt",
  "group-even/tr:bg-kbf-light-purple",
);
const EMPTY_TD_CX = clx(TD_CX, "text-center text-sm italic");

export default function Table<T>(props: Props<T>) {
  return (
    <table class={props.class}>
      <thead>
        <tr class="border-b-2 border-kbf-text-accent">
          <For each={props.headers}>
            {(row) => (
              <th scope="col" class="text-sm text-kbf-text-accent">
                {row}
              </th>
            )}
          </For>
        </tr>
      </thead>
      <tbody class="before:block before:h-4 before:indent-[-99999px] before:content-['']">
        <For
          each={props.each}
          fallback={
            <tr>
              <td colspan={props.headers.length} class={EMPTY_TD_CX}>
                None
              </td>
            </tr>
          }
        >
          {(item) => (
            <tr
              onClick={props.onRowClick && [props.onRowClick, item]}
              class={clx("group/tr", props.onRowClick && "group/tr-action")}
            >
              <For each={props.children(item)}>{(cell) => <td class={MAIN_TD_CX}>{cell}</td>}</For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}
