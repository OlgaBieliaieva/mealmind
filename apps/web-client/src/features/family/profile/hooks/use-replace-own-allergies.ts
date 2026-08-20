"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  replaceOwnAllergies,
  replaceManagedAllergies,
  type AllergiesPayload,
  type OwnProfile,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useReplaceOwnAllergies(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: (input: AllergiesPayload) =>
      target.kind === "OWN"
        ? replaceOwnAllergies(input)
        : replaceManagedAllergies(target.memberId, input),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Алергії оновлено");
      options.onSuccess?.(profile);
    },
  });
}
