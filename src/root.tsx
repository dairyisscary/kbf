// @refresh reload
import { Suspense } from "solid-js";
import {
  Body,
  ErrorBoundary,
  FileRoutes,
  Head,
  Html,
  Meta,
  Link,
  Routes,
  Scripts,
  Title,
} from "solid-start";

import "./root.css";

import Wrapper from "~/root-wrapper";

export function getDocumentTitle(title: string) {
  return `${title} · Kbf`;
}

export default function Root() {
  return (
    <Html lang="en">
      <Head>
        <Meta charset="utf-8" />
        <Title>{getDocumentTitle("To the moon!")}</Title>
        <Meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta name="release-name" content={import.meta.env.PUBLIC_RELEASE_NAME} />
        <Link rel="icon" href="/favicon.png" />
      </Head>
      <Body>
        <Suspense>
          <ErrorBoundary>
            <Wrapper>
              <Routes>
                <FileRoutes />
              </Routes>
            </Wrapper>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  );
}
