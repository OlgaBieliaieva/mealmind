"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  replaceOwnDislikedProducts,
  replaceManagedDislikedProducts,
  type DislikedProductsPayload,
  type OwnProfile,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useReplaceOwnDislikedProducts(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: (input: DislikedProductsPayload) =>
      target.kind === "OWN"
        ? replaceOwnDislikedProducts(input)
        : replaceManagedDislikedProducts(target.memberId, input),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Небажані продукти оновлено");
      options.onSuccess?.(profile);
    },
  });
}
