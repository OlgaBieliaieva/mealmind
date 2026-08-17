"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { cancelOwnWeightGoal, cancelManagedWeightGoal, type OwnProfile } from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useCancelOwnWeightGoal(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: () =>
      target.kind === "OWN" ? cancelOwnWeightGoal() : cancelManagedWeightGoal(target.memberId),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Ціль скасовано");
      options.onSuccess?.(profile);
    },
  });
}
