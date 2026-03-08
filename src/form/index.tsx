import { createUniqueId, type JSX, type ComponentProps, For, createMemo, untrack } from "solid-js";

import clx from "~/clx";
import Icon from "~/icon";

const LABEL_CX = "text-lg font-medium";
const CLICK_LABEL_CX = clx(LABEL_CX, "cursor-pointer");

export function Label(props: ComponentProps<"label">) {
  return <label {...props} class={clx(CLICK_LABEL_CX, props.class)} />;
}

export function NonInteractiveLabel(props: ComponentProps<"span">) {
  return <span {...props} class={clx(LABEL_CX, props.class)} />;
}

export function FormRow(props: Omit<ComponentProps<"div">, "class">) {
  return <div {...props} class="my-14 flex flex-col gap-3" />;
}

export function FormRowWithId(
  props: Omit<ComponentProps<typeof FormRow>, "children"> & {
    children: (id: string) => ComponentProps<typeof FormRow>["children"];
  },
) {
  const id = createUniqueId();
  return <FormRow {...props}>{props.children(id)}</FormRow>;
}

export function Checkbox(props: {
  checked?: boolean | undefined;
  name: string;
  children: JSX.Element;
  id?: string;
  onInput?: (event: InputEvent) => void;
}) {
  return (
    <div class="group">
      <input
        type="checkbox"
        checked={props.checked}
        class="sr-only"
        name={props.name}
        id={props.id}
        onInput={props.onInput}
      />
      <Label for={props.id} class="flex items-center gap-3">
        <div class="flex size-6 -rotate-z-180 items-center justify-center rounded border-2 border-kbf-action bg-kbf-dark-purple transition duration-300 group-has-checked:rotate-z-0 group-has-checked:bg-kbf-action group-has-focus:ring-2 group-has-focus:ring-kbf-text-accent">
          <Icon
            name="check"
            class="rounded text-kbf-text-highlight opacity-0 transition duration-300 group-has-checked:opacity-100"
          />
        </div>
        {props.children}
      </Label>
    </div>
  );
}

export function pealFormData(formData: FormData, arrayKeys?: string[]) {
  const result: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of formData.keys()) {
    result[key] = arrayKeys?.includes(key) ? formData.getAll(key) : formData.get(key)!;
  }
  return result;
}

export function FormFooter(props: { children: JSX.Element }) {
  return (
    <footer class="flex items-center justify-end gap-4 border-t border-kbf-accent-border pt-8">
      {props.children}
    </footer>
  );
}

export function RadioTabs<V extends string>(props: {
  id?: string;
  name: string;
  initValue: V;
  options: ReadonlyArray<{ value: V; label: JSX.Element }>;
}) {
  return (
    <div class="flex items-stretch rounded-md border-2 border-kbf-light-purple bg-kbf-light-purple">
      <For each={props.options}>
        {(option) => {
          const id = createMemo(() => `${props.id || "radio-tabs"}-${option.value}`);
          return (
            <div class="flex-1 rounded-md text-center ring-kbf-action-highlight transition duration-300 ring-inset has-checked:bg-kbf-action has-checked:text-kbf-text-highlight has-focus-within:ring-2">
              <input
                ref={(element) => {
                  if (untrack(() => props.initValue === option.value)) {
                    element.checked = true;
                  }
                }}
                type="radio"
                class="sr-only"
                id={id()}
                name={props.name}
                value={option.value}
              />
              <label
                class={clx(CLICK_LABEL_CX, "block size-full px-4 py-3 text-center")}
                for={id()}
              >
                {option.label}
              </label>
            </div>
          );
        }}
      </For>
    </div>
  );
}

export function FieldSet(props: { legend: string; children: JSX.Element }) {
  return (
    <fieldset class="space-y-3">
      <legend class={LABEL_CX}>{props.legend}</legend>
      {props.children}
    </fieldset>
  );
}
