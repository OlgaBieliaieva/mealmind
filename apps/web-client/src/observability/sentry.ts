import {
  resolveSentryRuntimeConfig,
  sanitizeSentryEvent,
  type SentryApplication,
  type SentryRuntime,
} from "@mealmind/observability";
import * as Sentry from "@sentry/nextjs";

export interface InitializeWebSentryOptions {
  readonly application: SentryApplication;
  readonly runtime: SentryRuntime;
  readonly dsn: string | undefined;
  readonly environment: string | undefined;
  readonly release: string | undefined;
}

export function initializeWebSentry(options: InitializeWebSentryOptions): void {
  const config = resolveSentryRuntimeConfig(options);

  if (!config.enabled) {
    Sentry.init({
      enabled: false,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      enableLogs: false,
      beforeBreadcrumb: () => null,
      beforeSend: (event) => sanitizeSentryEvent(event),
    });

    return;
  }

  Sentry.init({
    dsn: config.dsn,
    enabled: true,
    environment: config.policy.environment,
    release: config.policy.release,
    initialScope: {
      tags: {
        ...config.policy.tags,
      },
    },
    sendDefaultPii: config.policy.sendDefaultPii,
    tracesSampleRate: config.policy.tracesSampleRate,
    enableLogs: false,
    attachStacktrace: true,
    debug: false,
    beforeBreadcrumb: () => null,
    beforeSend: (event) => sanitizeSentryEvent(event),
  });
}
