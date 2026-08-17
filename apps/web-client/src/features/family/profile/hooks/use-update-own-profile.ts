"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  updateOwnProfile,
  updateManagedProfile,
  type OwnProfile,
  type OwnProfilePatch,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useUpdateOwnProfile(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: (input: OwnProfilePatch) =>
      target.kind === "OWN"
        ? updateOwnProfile(input)
        : updateManagedProfile(target.memberId, input),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Профіль оновлено");
      options.onSuccess?.(profile);
    },
  });
}
