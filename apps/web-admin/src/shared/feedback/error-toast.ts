import { toast } from "sonner";

import { getUserFacingErrorMessage } from "@/shared/api/api-error";

export function showErrorToast(error: unknown): void {
  toast.error(getUserFacingErrorMessage(error));
}
