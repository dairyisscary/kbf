import { useSubmission } from "@solidjs/router";
import { onCleanup } from "solid-js";

export function useClearingSubmission(action: Parameters<typeof useSubmission>[0]) {
  const submission = useSubmission(action);
  onCleanup(() => {
    if (submission.result || submission.error) {
      submission.clear();
    }
  });
  return submission;
}
