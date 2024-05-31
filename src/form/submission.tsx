import { onCleanup } from "solid-js";
import { useSubmission } from "@solidjs/router";

export function useClearingSubmission(action: Parameters<typeof useSubmission>[0]) {
  const submission = useSubmission(action);
  onCleanup(() => {
    if (submission.result || submission.error) {
      submission.clear();
    }
  });
  return submission;
}
