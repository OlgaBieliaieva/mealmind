"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import {
  createAccountInvitation,
  readAccountInvitation,
  resendAccountInvitation,
  revokeAccountInvitation,
  type AccountInvitation,
} from "@/shared/api/family";

import { ApiClientError } from "@/shared/api/api-error";

import { familyQueryKeys } from "../family-query-keys";

export function useAccountInvitation(memberId: string | null) {
  return useQuery({
    queryKey:
      memberId === null
        ? ["family", "members", "no-member", "account-invitation"]
        : familyQueryKeys.invitation(memberId),

    queryFn: () => {
      if (memberId === null) {
        return Promise.resolve(null);
      }

      return readAccountInvitation(memberId);
    },

    enabled: memberId !== null,
  });
}

function invitationErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "EXISTING_ACCOUNT_NOT_SUPPORTED") {
      return "Для цієї email-адреси вже існує обліковий запис MealMind. Приєднання наявних облікових записів поки не підтримується.";
    }

    if (error.code === "INVITATION_ALREADY_PENDING") {
      return "Для цього профілю вже є активне запрошення.";
    }
  }

  return "Не вдалося виконати дію із запрошенням";
}

export function useCreateAccountInvitation(memberId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipientEmail: string) => {
      if (memberId === null) {
        throw new Error("Family member is required");
      }

      return createAccountInvitation(memberId, recipientEmail);
    },

    onSuccess: async (invitation) => {
      if (memberId !== null) {
        queryClient.setQueryData<AccountInvitation | null>(
          familyQueryKeys.invitation(memberId),
          invitation,
        );
      }

      toast.success("Запрошення надіслано");
    },

    onError: (error) => {
      toast.error(invitationErrorMessage(error));
    },
  });
}

export function useResendAccountInvitation(memberId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (memberId === null) {
        throw new Error("Family member is required");
      }

      return resendAccountInvitation(memberId);
    },

    onSuccess: (invitation) => {
      if (memberId !== null) {
        queryClient.setQueryData<AccountInvitation | null>(
          familyQueryKeys.invitation(memberId),
          invitation,
        );
      }

      toast.success("Запрошення надіслано повторно");
    },

    onError: (error) => {
      toast.error(invitationErrorMessage(error));
    },
  });
}

export function useRevokeAccountInvitation(memberId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (memberId === null) {
        throw new Error("Family member is required");
      }

      await revokeAccountInvitation(memberId);
    },

    onSuccess: () => {
      if (memberId !== null) {
        queryClient.setQueryData<AccountInvitation | null>(
          familyQueryKeys.invitation(memberId),
          null,
        );
      }

      toast.success("Запрошення відкликано");
    },

    onError: (error) => {
      toast.error(invitationErrorMessage(error));
    },
  });
}
