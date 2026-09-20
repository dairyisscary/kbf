import type { ComponentProps } from "@solidjs/web";
import type { CategoryKind } from "kysely-codegen";

import { Icon } from "#/icon";

export function CategoryKindIcon(
  props: Pick<ComponentProps<typeof Icon>, "size"> & { kind: CategoryKind },
) {
  return <Icon size={props.size} name={props.kind === "payment" ? "credit-card" : "bar-chart-2"} />;
}
