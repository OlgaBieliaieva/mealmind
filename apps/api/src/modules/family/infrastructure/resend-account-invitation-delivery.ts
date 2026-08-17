import { Resend } from "resend";
import type { AccountInvitationDelivery } from "../domain/account-invitation.js";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

export function createResendAccountInvitationDelivery(options: {
  readonly apiKey: string;
  readonly fromEmail: string;
}): AccountInvitationDelivery {
  const resend = new Resend(options.apiKey);
  return Object.freeze({
    async send(input: Parameters<AccountInvitationDelivery["send"]>[0]) {
      const link = escapeHtml(input.activationUrl);
      const { error } = await resend.emails.send(
        {
          from: options.fromEmail,
          to: [input.recipientEmail],
          subject: "Запрошення до MealMind",
          html: `<p>Вас запросили активувати власний профіль у MealMind.</p><p><a href="${link}">Активувати обліковий запис</a></p><p>Якщо ви не очікували цього листа, просто проігноруйте його.</p>`,
          text: `Вас запросили активувати власний профіль у MealMind.\n\n${input.activationUrl}\n\nЯкщо ви не очікували цього листа, просто проігноруйте його.`,
        },
        { idempotencyKey: input.idempotencyKey },
      );
      if (error !== null) throw new Error("Resend rejected invitation email");
    },
  });
}
