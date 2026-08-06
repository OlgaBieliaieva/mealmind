import type { VerifiedIdentity } from "../../../application/authentication/authentication-service.js";
import { AccountUnavailableError, AuthEmailNotVerifiedError } from "./account-errors.js";
import type { Account, AccountRepository } from "../domain/account-repository.js";

export interface AccountService {
  bootstrap(identity: VerifiedIdentity): Promise<Account>;
}

export function createAccountService(repository: AccountRepository): AccountService {
  const service: AccountService = {
    async bootstrap(identity) {
      if (!identity.emailVerified || identity.email === null) {
        throw new AuthEmailNotVerifiedError();
      }

      const account = await repository.bootstrap(identity.subject, identity.email);

      if (account === null) {
        throw new AccountUnavailableError();
      }

      return account;
    },
  };

  return Object.freeze(service);
}
