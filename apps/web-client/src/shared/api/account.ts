import { getBrowserApiClient } from "./browser-api-client";

export interface ApplicationSession {
  readonly id: string;
  readonly email: string;
  readonly applicationRole: "USER" | "ADMIN";
}

interface AccountResponse {
  readonly data: {
    readonly user: ApplicationSession;
    readonly onboardingCompleted?: boolean;
    readonly profile?: unknown;
    readonly family?: unknown;
  };
}

export interface ApplicationSessionContext {
  readonly user: ApplicationSession;
  readonly onboardingCompleted: boolean;
  readonly profile: unknown;
  readonly family: unknown;
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

export async function readApplicationSessionContext(): Promise<ApplicationSessionContext> {
  const response = await getBrowserApiClient().get<AccountResponse>("/api/v1/session");
  return {
    user: response.data.user,
    onboardingCompleted: response.data.onboardingCompleted === true,
    profile: response.data.profile ?? null,
    family: response.data.family ?? null,
  };
}
