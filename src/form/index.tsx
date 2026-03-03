import { createUniqueId, type JSX, type ComponentProps } from "solid-js";

import clx from "~/clx";
import Icon from "~/icon";

export function Label(props: ComponentProps<"label">) {
  return <label {...props} class={clx("cursor-pointer text-lg font-medium", props.class)} />;
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
