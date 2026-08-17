"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  appendOwnActivityPeriod,
  appendManagedActivityPeriod,
  type ActivityPeriodPayload,
  type OwnProfile,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useAppendOwnActivityPeriod(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: (input: ActivityPeriodPayload) =>
      target.kind === "OWN"
        ? appendOwnActivityPeriod(input)
        : appendManagedActivityPeriod(target.memberId, input),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Рівень активності оновлено");
      options.onSuccess?.(profile);
    },
  });
}
