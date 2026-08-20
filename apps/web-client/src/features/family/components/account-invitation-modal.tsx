"use client";

import { useState, type FormEvent } from "react";

import type { FamilyMember } from "@/shared/api/family";

import { Button, Modal, TextInput, Typography } from "@/shared/ui";

import {
  useAccountInvitation,
  useCreateAccountInvitation,
  useResendAccountInvitation,
  useRevokeAccountInvitation,
} from "../hooks/use-account-invitation";

interface AccountInvitationModalProps {
  readonly member: FamilyMember | null;
  readonly onClose: () => void;
}

function invitationStatusLabel(status: "ACCEPTED" | "REVOKED" | "EXPIRED"): string {
  if (status === "EXPIRED") {
    return "термін дії минув";
  }

  if (status === "REVOKED") {
    return "відкликано";
  }

  return "використано";
}

export function AccountInvitationModal({ member, onClose }: AccountInvitationModalProps) {
  const [recipientEmail, setRecipientEmail] = useState("");

  const memberId = member?.id ?? null;

  const invitation = useAccountInvitation(memberId);

  const createInvitation = useCreateAccountInvitation(memberId);

  const resendInvitation = useResendAccountInvitation(memberId);

  const revokeInvitation = useRevokeAccountInvitation(memberId);

  if (member === null) {
    return null;
  }

  const isPending =
    createInvitation.isPending || resendInvitation.isPending || revokeInvitation.isPending;

  function handleCreate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const normalizedEmail = recipientEmail.trim();

    if (normalizedEmail.length === 0) {
      return;
    }

    createInvitation.mutate(normalizedEmail, {
      onSuccess: () => {
        setRecipientEmail("");
      },
    });
  }

  return (
    <Modal
      open
      title="Активація облікового запису"
      description={`Надішліть запрошення для профілю ${member.firstName}. Після активації наявні дані та історія профілю буде збережена.`}
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      {invitation.isPending ? (
        <Typography variant="supporting" role="status">
          Перевіряємо стан запрошення…
        </Typography>
      ) : invitation.isError ? (
        <Typography variant="supporting">
          Не вдалося отримати стан запрошення. Спробуйте закрити вікно та відкрити його повторно.
        </Typography>
      ) : invitation.data?.status === "PENDING" ? (
        <div className="family-form">
          <div className="family-invitation-status">
            <Typography variant="body">
              Очікує активації: {invitation.data.recipientEmail}
            </Typography>

            <Typography variant="caption">
              Дійсне до {new Date(invitation.data.expiresAt).toLocaleString("uk-UA")}
            </Typography>
          </div>

          <div className="family-invitation-actions">
            <Button
              type="button"
              variant="secondary"
              isLoading={resendInvitation.isPending}
              disabled={revokeInvitation.isPending}
              onClick={() => {
                resendInvitation.mutate();
              }}
            >
              Надіслати повторно
            </Button>

            <Button
              type="button"
              variant="danger"
              isLoading={revokeInvitation.isPending}
              disabled={resendInvitation.isPending}
              onClick={() => {
                revokeInvitation.mutate();
              }}
            >
              Відкликати
            </Button>
          </div>
        </div>
      ) : (
        <form className="family-form" onSubmit={handleCreate}>
          {invitation.data !== null && invitation.data !== undefined ? (
            <Typography variant="supporting">
              Попереднє запрошення:{" "}
              {invitationStatusLabel(invitation.data.status as "ACCEPTED" | "REVOKED" | "EXPIRED")}.
            </Typography>
          ) : null}

          <TextInput
            label="Email учасника"
            description="Лист із безпечним посиланням на активацію буде надіслано через серверний email-сервіс MealMind."
            type="email"
            autoComplete="email"
            value={recipientEmail}
            onChange={(event) => {
              setRecipientEmail(event.target.value);
            }}
            required
            maxLength={320}
            disabled={isPending}
          />

          <Button
            type="submit"
            isLoading={createInvitation.isPending}
            disabled={recipientEmail.trim().length === 0}
          >
            Надіслати запрошення
          </Button>
        </form>
      )}
    </Modal>
  );
}
