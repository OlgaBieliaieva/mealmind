import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  APP_ORIGIN: z.string().trim().url(),
  WEB_CLIENT_ORIGIN: z.string().trim().url(),
});

export function readServerWebEnv() {
  const result = serverEnvironmentSchema.safeParse({
    APP_ORIGIN: process.env.APP_ORIGIN,
    WEB_CLIENT_ORIGIN: process.env.WEB_CLIENT_ORIGIN,
  });

  if (!result.success) {
    throw new Error(
      "Invalid web-admin server environment variables: APP_ORIGIN, WEB_CLIENT_ORIGIN",
    );
  }

  return Object.freeze({
    appOrigin: new URL(result.data.APP_ORIGIN).origin,
    webClientOrigin: new URL(result.data.WEB_CLIENT_ORIGIN).origin,
  });
}
