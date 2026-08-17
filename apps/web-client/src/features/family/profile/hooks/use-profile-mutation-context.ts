"use client";

import { useQueryClient } from "@tanstack/react-query";

import type { OwnProfile } from "@/shared/api/family";

import { profileQueryKey } from "../profile-query-keys";
import { useProfileTarget } from "../profile-target-context";

export function useProfileMutationContext() {
  const queryClient = useQueryClient();
  const target = useProfileTarget();

  function commitProfile(profile: OwnProfile): void {
    queryClient.setQueryData(profileQueryKey(target), profile);

    if (target.kind === "FAMILY_MEMBER") {
      void queryClient.invalidateQueries({
        queryKey: ["family", "members"],
      });
    }
  }

  return {
    target,
    commitProfile,
  } as const;
}
