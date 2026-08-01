import { resolveSentryRuntimeConfig, sanitizeSentryEvent } from "@mealmind/observability";
import * as Sentry from "@sentry/node";

export interface InitializeApiSentryOptions {
  readonly dsn: string | undefined;
  readonly environment: string | undefined;
  readonly release: string | undefined;
}

export interface CaptureApiExceptionContext {
  readonly level?: "fatal" | "error" | "warning" | "log" | "info" | "debug";
  readonly tags?: Readonly<Record<string, string>>;
}

export function initializeApiSentry(options: InitializeApiSentryOptions): void {
  const config = resolveSentryRuntimeConfig({
    application: "api",
    runtime: "node",
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
  });

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

export function captureApiException(error: unknown, context?: CaptureApiExceptionContext): void {
  Sentry.withScope((scope) => {
    if (context?.tags) {
      scope.setTags(context.tags);
    }

    if (context?.level) {
      scope.setLevel(context.level);
    }

    Sentry.captureException(error);
  });
}

export async function flushApiSentry(timeoutMs = 2_000): Promise<void> {
  await Sentry.flush(timeoutMs);
}
