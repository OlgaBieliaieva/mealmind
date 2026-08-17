"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  appendOwnBodyMeasurement,
  appendManagedBodyMeasurement,
  type BodyMeasurementPayload,
  type OwnProfile,
} from "@/shared/api/family";

import { useProfileMutationContext } from "./use-profile-mutation-context";

interface Options {
  readonly onSuccess?: (profile: OwnProfile) => void;
}

export function useAppendOwnBodyMeasurement(options: Options = {}) {
  const { target, commitProfile } = useProfileMutationContext();

  return useMutation({
    mutationFn: (input: BodyMeasurementPayload) =>
      target.kind === "OWN"
        ? appendOwnBodyMeasurement(input)
        : appendManagedBodyMeasurement(target.memberId, input),

    onSuccess: (profile) => {
      commitProfile(profile);
      toast.success("Вимірювання додано");
      options.onSuccess?.(profile);
    },
  });
}
