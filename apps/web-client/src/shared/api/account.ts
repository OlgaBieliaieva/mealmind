import { getBrowserApiClient } from "./browser-api-client";

export interface ApplicationSession {
  readonly id: string;
  readonly email: string;
  readonly applicationRole: "USER" | "ADMIN";
}

interface AccountResponse {
  readonly data: {
    readonly user: ApplicationSession;
  };
}

export async function bootstrapAccount(): Promise<ApplicationSession> {
  const response = await getBrowserApiClient().post<AccountResponse>(
    "/api/v1/account/bootstrap",
    {},
  );
  return response.data.user;
}

export async function readApplicationSession(): Promise<ApplicationSession> {
  const response = await getBrowserApiClient().get<AccountResponse>("/api/v1/session");
  return response.data.user;
}
