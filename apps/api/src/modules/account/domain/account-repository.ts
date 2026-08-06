export type AccountRole = "USER" | "ADMIN";

export interface Account {
  readonly id: string;
  readonly externalSubject: string;
  readonly email: string;
  readonly applicationRole: AccountRole;
}

export interface AccountRepository {
  bootstrap(externalSubject: string, email: string): Promise<Account | null>;
}
