"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  replaceOwnWeightGoal,
  replaceManagedWeightGoal,
  type OwnProfile,
  type WeightGoalPayload,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useReplaceOwnWeightGoal(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: (input: WeightGoalPayload) =>
      target.kind === "OWN"
        ? replaceOwnWeightGoal(input)
        : replaceManagedWeightGoal(target.memberId, input),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Ціль щодо ваги оновлено");
      options.onSuccess?.(profile);
    },
  });
}
