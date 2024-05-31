import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { ErrorBoundary, Suspense } from "solid-js";

import "./app.css";
import RootWrapper from "~/root-wrapper";

export function KbfSiteTitle(props: { children: string }) {
  return <Title>{`${props.children} · Kbf`}</Title>;
}

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
