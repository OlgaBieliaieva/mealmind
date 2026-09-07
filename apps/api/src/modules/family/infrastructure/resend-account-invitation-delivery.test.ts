import { beforeEach, describe, expect, it, vi } from "vitest";

import { createResendAccountInvitationDelivery } from "./resend-account-invitation-delivery.js";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    readonly emails = { send: mocks.send };
  },
}));

describe("createResendAccountInvitationDelivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a text and escaped HTML invitation with an idempotency key", async () => {
    mocks.send.mockResolvedValue({ data: { id: "email-id" }, error: null });
    const delivery = createResendAccountInvitationDelivery({
      apiKey: "re_test",
      fromEmail: "MealMind <hello@mail.mealmind.in.ua>",
    });
    const activationUrl =
      "https://app.mealmind.in.ua/account-activation/start?token=token&next=%2Ffamily";

    await delivery.send({
      recipientEmail: "member@example.com",
      activationUrl,
      idempotencyKey: "invitation-id:1",
    });

    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "MealMind <hello@mail.mealmind.in.ua>",
        to: ["member@example.com"],
        subject: "Запрошення до MealMind",
        text: expect.stringContaining(activationUrl),
        html: expect.stringContaining("token=token&amp;next=%2Ffamily"),
      }),
      { idempotencyKey: "invitation-id:1" },
    );
  });

  it("returns a stable error without exposing provider details", async () => {
    mocks.send.mockResolvedValue({
      data: null,
      error: { message: "provider-sensitive-error" },
    });
    const delivery = createResendAccountInvitationDelivery({
      apiKey: "re_test",
      fromEmail: "MealMind <hello@mail.mealmind.in.ua>",
    });

    await expect(
      delivery.send({
        recipientEmail: "member@example.com",
        activationUrl: "https://app.mealmind.in.ua/account-activation/start?token=token",
        idempotencyKey: "invitation-id:2",
      }),
    ).rejects.toThrow("Resend rejected invitation email");
  });
});
