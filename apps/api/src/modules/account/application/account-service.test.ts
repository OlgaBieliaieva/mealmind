import { describe, expect, it, vi } from "vitest";

import { AccountUnavailableError, AuthEmailNotVerifiedError } from "./account-errors.js";
import { createAccountService } from "./account-service.js";
import type { AccountRepository } from "../domain/account-repository.js";

const identity = {
  subject: "252b50f0-47a3-4444-b40a-02f84fbb86a4",
  email: "person@example.com",
  emailVerified: true,
} as const;

describe("account service", () => {
  it("creates a USER account from verified identity data", async () => {
    const repository: AccountRepository = {
      bootstrap: vi.fn(async (externalSubject, email) => ({
        id: "cbf7c697-b7fa-4f10-beb7-43e272fcaa12",
        externalSubject,
        email,
        applicationRole: "USER" as const,
      })),
    };

    const account = await createAccountService(repository).bootstrap(identity);

    expect(repository.bootstrap).toHaveBeenCalledWith(identity.subject, identity.email);
    expect(account.applicationRole).toBe("USER");
  });

  it("rejects an identity without a verified email", async () => {
    const repository: AccountRepository = {
      bootstrap: vi.fn(),
    };

    await expect(
      createAccountService(repository).bootstrap({
        ...identity,
        emailVerified: false,
      }),
    ).rejects.toBeInstanceOf(AuthEmailNotVerifiedError);
    expect(repository.bootstrap).not.toHaveBeenCalled();
  });

  it("does not revive an unavailable local account", async () => {
    const repository: AccountRepository = {
      bootstrap: vi.fn(async () => null),
    };

    await expect(createAccountService(repository).bootstrap(identity)).rejects.toBeInstanceOf(
      AccountUnavailableError,
    );
  });
});
