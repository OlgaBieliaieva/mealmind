"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  replaceOwnMealTypes,
  replaceManagedMealTypes,
  type MealTypesPayload,
  type OwnProfile,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useReplaceOwnMealTypes(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: (input: MealTypesPayload) =>
      target.kind === "OWN"
        ? replaceOwnMealTypes(input)
        : replaceManagedMealTypes(target.memberId, input),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Прийоми їжі оновлено");
      options.onSuccess?.(profile);
    },
  });
}
