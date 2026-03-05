import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { ErrorBoundary, Suspense } from "solid-js";

import RootWrapper from "~/root-wrapper";

import "~/app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Suspense>
            <ErrorBoundary fallback={<h1>Something went horribly wrong</h1>}>
              <RootWrapper>{props.children}</RootWrapper>
            </ErrorBoundary>
          </Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
