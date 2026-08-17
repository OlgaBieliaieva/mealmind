"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  replaceOwnDietaryRestrictions,
  replaceManagedDietaryRestrictions,
  type DietaryRestrictionsPayload,
  type OwnProfile,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useReplaceOwnDietaryRestrictions(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: (input: DietaryRestrictionsPayload) =>
      target.kind === "OWN"
        ? replaceOwnDietaryRestrictions(input)
        : replaceManagedDietaryRestrictions(target.memberId, input),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Дієтичні обмеження оновлено");
      options.onSuccess?.(profile);
    },
  });
}
