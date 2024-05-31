// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

import Favicon from "~/favicon.png";

const RELEASE_NAME = import.meta.env.PUBLIC_RELEASE_NAME;

function renderHTML() {
  return (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            {RELEASE_NAME && <meta name="release-name" content={RELEASE_NAME} />}
            <link rel="icon" href={Favicon} />
            {assets}
          </head>
          <body>
            <div id="kbf">{children}</div>
            {scripts}
          </body>
        </html>
      )}
    />
  );
}

export default createHandler(renderHTML, { mode: "async" });
