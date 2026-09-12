import type { JSX } from "@solidjs/web";

export function Alert(props: {
  ref?: JSX.Ref<HTMLParagraphElement>;
  class?: string;
  children: JSX.Element;
}) {
  return (
    <p
      ref={props.ref}
      class={[
        "rounded-md border-2 border-kbf-action-highlight bg-kbf-light-purple px-4 py-3 text-lg text-kbf-text-highlight",
        props.class,
      ]}
    >
      {props.children}
    </p>
  );
}
