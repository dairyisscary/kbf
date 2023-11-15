import { Title } from "solid-start";
import { HttpStatusCode } from "solid-start/server";

import { getDocumentTitle } from "~/root";

export default function NotFound() {
  return (
    <>
      <Title>{getDocumentTitle("Not Found")}</Title>
      <HttpStatusCode code={404} />
      <h1>Page Not Found</h1>
    </>
  );
}
