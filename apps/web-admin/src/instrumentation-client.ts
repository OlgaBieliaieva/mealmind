import * as Sentry from "@sentry/nextjs";

import { initializeWebSentry } from "@/observability/sentry";

initializeWebSentry({
  application: "web-admin",
  runtime: "browser",
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
