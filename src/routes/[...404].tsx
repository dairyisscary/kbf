import { HttpStatusCode } from "solid-start/server";

import { Title } from "~/root";

export default function NotFound() {
  return (
    <>
      <Title>Not Found</Title>
      <HttpStatusCode code={404} />
      <h1>Page Not Found</h1>
    </>
  );
}
