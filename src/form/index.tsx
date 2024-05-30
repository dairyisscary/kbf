import { createUniqueId, type JSX, type ComponentProps } from "solid-js";

import clx from "~/clx";
import Icon from "~/icon";

import Styles from "./index.module.css";

export function Label(props: ComponentProps<"label">) {
  return <label {...props} class={clx(Styles.label, props.class)} />;
}

export function FormRow(props: ComponentProps<"div">) {
  return <div {...props} class={clx(Styles.row, props.class)} />;
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
    <>
      <input
        type="checkbox"
        checked={props.checked}
        class={clx(Styles.checkbox, "sr-only")}
        name={props.name}
        id={props.id}
        onInput={props.onInput}
      />
      <Label for={props.id}>
        <div class={Styles.visualcheckbox}>
          <Icon name="check" class={Styles.checkboxicon} />
        </div>
        {props.children}
      </Label>
    </>
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
