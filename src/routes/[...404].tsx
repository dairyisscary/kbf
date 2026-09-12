import { defineRoute } from "@solidjs/router";
import { httpStatus } from "@solidjs/web";

import { HttpErrorPage } from "#/error";

export const route = defineRoute({
  preload: () => httpStatus(404),
});

export default function FourOhFour() {
  return <HttpErrorPage code={404} />;
}
