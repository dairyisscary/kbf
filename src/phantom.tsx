import type { JSX } from "@solidjs/web";

export function PhantomBlock(props: { class?: string; style?: JSX.CSSProperties }) {
  return (
    <span class={["block animate-pulse bg-kbf-accent-border", props.class]} style={props.style} />
  );
}

export function PhantomText() {
  return (
    <PhantomBlock
      class="h-lh rounded"
      style={{ width: `max(20px, ${Math.floor(Math.random() * 10 + 1)}dvw)` }}
    />
  );
}
