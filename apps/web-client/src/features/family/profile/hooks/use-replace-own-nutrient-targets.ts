"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  replaceOwnNutrientTargets,
  replaceManagedNutrientTargets,
  type NutrientTargetsPayload,
  type OwnProfile,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useReplaceOwnNutrientTargets(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: (input: NutrientTargetsPayload) =>
      target.kind === "OWN"
        ? replaceOwnNutrientTargets(input)
        : replaceManagedNutrientTargets(target.memberId, input),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Цільові показники оновлено");
      options.onSuccess?.(profile);
    },
  });
}
