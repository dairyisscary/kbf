import { Title } from "@solidjs/meta";

export function KbfSiteTitle(props: { children: string }) {
  return <Title>{`${props.children} · Kbf`}</Title>;
}
