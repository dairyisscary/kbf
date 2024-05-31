import { HttpStatusCode } from "@solidjs/start";

import { KbfSiteTitle } from "~/app";

export default function NotFound() {
  return (
    <>
      <KbfSiteTitle>Not Found</KbfSiteTitle>
      <HttpStatusCode code={404} />
      <h1>Page Not Found</h1>
    </>
  );
}
