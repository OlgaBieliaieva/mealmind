"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  completeOwnWeightGoal,
  completeManagedWeightGoal,
  type OwnProfile,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useCompleteOwnWeightGoal(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: () =>
      target.kind === "OWN" ? completeOwnWeightGoal() : completeManagedWeightGoal(target.memberId),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Ціль позначено як виконану");
      options.onSuccess?.(profile);
    },
  });
}
