"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  recalculateOwnNutrientTargets,
  recalculateManagedNutrientTargets,
  type OwnProfile,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useRecalculateOwnNutrientTargets(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: () =>
      target.kind === "OWN"
        ? recalculateOwnNutrientTargets()
        : recalculateManagedNutrientTargets(target.memberId),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Цільові показники розраховано");
      options.onSuccess?.(profile);
    },
  });
}
