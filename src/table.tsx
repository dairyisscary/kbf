import { For, type JSX } from "solid-js";

import clx from "~/clx";

import Styles from "./table.module.css";

type Props<T> = {
  class?: string;
  headers: JSX.Element[];
  each: T[] | null | undefined;
  onRowClick?: (item: T, event: MouseEvent) => void;
  children: (item: T) => JSX.Element[];
};

export default function Table<T>(props: Props<T>) {
  return (
    <table class={clx("w-full overflow-x-scroll", props.class)}>
      <thead>
        <tr class="border-b-2 border-kbf-text-accent">
          <For each={props.headers}>
            {(row) => (
              <th scope="col" class={Styles.th}>
                {row}
              </th>
            )}
          </For>
        </tr>
      </thead>
      <tbody class="before:block before:indent-[-99999px] before:leading-4 before:content-['@']">
        <For
          each={props.each}
          fallback={
            <tr>
              <td colspan={props.headers.length} class={clx(Styles.bodycell, Styles.empty)}>
                None
              </td>
            </tr>
          }
        >
          {(item) => (
            <tr
              onClick={props.onRowClick && [props.onRowClick, item]}
              class={props.onRowClick && Styles.action}
            >
              <For each={props.children(item)}>
                {(cell) => <td class={Styles.bodycell}>{cell}</td>}
              </For>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}
