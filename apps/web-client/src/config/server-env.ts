import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  APP_ORIGIN: z.string().trim().url(),
});

export interface ServerWebConfig {
  readonly appOrigin: string;
}

export function readServerWebEnv(): ServerWebConfig {
  const result = serverEnvironmentSchema.safeParse({
    APP_ORIGIN: process.env.APP_ORIGIN,
  });

  if (!result.success) {
    throw new Error("Invalid web-client server environment variables: APP_ORIGIN");
  }

  return Object.freeze({
    appOrigin: new URL(result.data.APP_ORIGIN).origin,
  });
}
