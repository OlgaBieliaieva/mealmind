"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  replaceOwnCuisinePreferences,
  replaceManagedCuisinePreferences,
  type CuisinePreferencesPayload,
  type OwnProfile,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useReplaceOwnCuisinePreferences(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: (input: CuisinePreferencesPayload) =>
      target.kind === "OWN"
        ? replaceOwnCuisinePreferences(input)
        : replaceManagedCuisinePreferences(target.memberId, input),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Улюблені кухні оновлено");
      options.onSuccess?.(profile);
    },
  });
}
