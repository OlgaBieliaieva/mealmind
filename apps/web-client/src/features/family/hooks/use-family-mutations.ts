"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import {
  archiveFamilyMember,
  createFamilyMember,
  updateFamily,
  updateFamilyMember,
  type FamilyMember,
  type FamilyMemberPatch,
  type FamilyPatch,
} from "@/shared/api/family";

import { familyQueryKeys } from "../family-query-keys";

interface CreateFamilyMemberInput {
  readonly firstName: string;
  readonly lastName?: string;
  readonly birthDate?: string;
  readonly biologicalSex?: "MALE" | "FEMALE" | "UNSPECIFIED";
}

export function useUpdateFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: FamilyPatch) => updateFamily(input),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: familyQueryKeys.current,
      });

      toast.success("Налаштування сім’ї оновлено");
    },

    onError: () => {
      toast.error("Не вдалося оновити сім’ю");
    },
  });
}

export function useCreateFamilyMember(
  options: {
    readonly onSuccess?: (member: FamilyMember) => void;
  } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFamilyMemberInput) => createFamilyMember(input),

    onSuccess: async (member) => {
      await queryClient.invalidateQueries({
        queryKey: familyQueryKeys.members,
      });

      toast.success("Учасника додано");

      options.onSuccess?.(member);
    },

    onError: () => {
      toast.error("Не вдалося додати учасника");
    },
  });
}

export function useUpdateFamilyMember(
  options: {
    readonly onSuccess?: (member: FamilyMember) => void;
  } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      input,
    }: {
      readonly memberId: string;
      readonly input: FamilyMemberPatch;
    }) => updateFamilyMember(memberId, input),

    onSuccess: async (member) => {
      await queryClient.invalidateQueries({
        queryKey: familyQueryKeys.members,
      });

      toast.success("Профіль учасника оновлено");

      options.onSuccess?.(member);
    },

    onError: () => {
      toast.error("Не вдалося оновити профіль учасника");
    },
  });
}

export function useArchiveFamilyMember(
  options: {
    readonly onSuccess?: () => void;
  } = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveFamilyMember,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: familyQueryKeys.members,
      });

      toast.success("Учасника архівовано");

      options.onSuccess?.();
    },

    onError: () => {
      toast.error("Не вдалося архівувати учасника");
    },
  });
}
