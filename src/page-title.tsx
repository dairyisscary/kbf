import { Icon, type IconName } from "./icon";
import { KbfSiteTitle } from "./meta";

export function PageTitle(props: { children: string; icon: IconName }) {
  return (
    <>
      <KbfSiteTitle>{props.children}</KbfSiteTitle>
      <h1 class="flex items-center gap-4">
        <Icon name={props.icon} />
        {` ${props.children}`}
      </h1>
    </>
  );
}
