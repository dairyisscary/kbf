import { For, type JSX } from "@solidjs/web";

import { Button } from "#/button";
import { Icon, type IconName } from "#/icon";
import { PhantomText } from "#/phantom";
import { Table } from "#/table";

export function AssetBundleActionHeader(props: {
  children: JSX.Element;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <h2 class="flex items-center justify-between gap-4">
      {props.children}
      <Button variant="cancel" class="p-2" onClick={props.onClick}>
        <Icon size="sm" name={props.icon} />
      </Button>
    </h2>
  );
}

export function AssetBundle<T>(props: {
  title: JSX.Element;
  onRowClick?: (item: T) => void;
  each: T[];
  children: (item: T) => JSX.Element[];
}) {
  return (
    <div class="space-y-4">
      {props.title}
      <Table
        class="[&_td]:last:not-only:text-right [&_th]:last:text-right"
        headers={["Date", "Value"]}
        each={props.each}
        phantomRowCount={3}
        onRowClick={props.onRowClick}
      >
        {props.children}
      </Table>
    </div>
  );
}

const noCells = () => [];

export function PhantomAssetBundles(props: { bundles: unknown[] }) {
  return (
    <For each={Array.from({ length: 4 })}>
      {() => (
        <AssetBundle each={props.bundles} title={<PhantomText />}>
          {noCells}
        </AssetBundle>
      )}
    </For>
  );
}
