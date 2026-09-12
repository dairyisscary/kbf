import { HydrationScript, type JSX } from "@solidjs/web";

import Favicon from "#/favicon.png";

export default function Document(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>Kbf</title>
        <meta name="version" content={import.meta.env.PUBLIC_RELEASE_NAME || "dev"} />
        <link rel="icon" href={Favicon} />
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
