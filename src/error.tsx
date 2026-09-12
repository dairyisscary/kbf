import { KbfSiteTitle } from "./meta";

export function HttpErrorPage(props: { code: 404 | 500; class?: string }) {
  const title = () => (props.code >= 500 ? "Server Error" : "Not Found");
  return (
    <div class={[props.class, "flex items-center gap-16"]}>
      <KbfSiteTitle>{title()}</KbfSiteTitle>
      <p class="text-9xl font-semibold text-kbf-action-alt">{props.code}</p>
      <div class="flex-1 space-y-4 border-b-2 border-kbf-action-alt py-12">
        <h1 class="text-5xl">{title()}</h1>
        <p class="text-xl">
          {props.code >= 500
            ? "Something went horribly wrong"
            : "Could not find that... How did you get here?"}
        </p>
      </div>
    </div>
  );
}
