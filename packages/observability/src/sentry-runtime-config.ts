import {
  SENTRY_ENVIRONMENTS,
  createSentryEventPolicy,
  type SentryApplication,
  type SentryEnvironment,
  type SentryEventPolicy,
  type SentryRuntime,
} from "./sentry-event-policy.js";

export interface ResolveSentryRuntimeConfigOptions {
  readonly application: SentryApplication;
  readonly runtime: SentryRuntime;
  readonly dsn: string | undefined;
  readonly environment: string | undefined;
  readonly release: string | undefined;
  readonly requestId?: string | undefined;
}

export type ResolvedSentryRuntimeConfig =
  | Readonly<{
      enabled: false;
    }>
  | Readonly<{
      enabled: true;
      dsn: string;
      policy: SentryEventPolicy;
    }>;

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const normalizedValue = value?.trim();

  return normalizedValue === undefined || normalizedValue.length === 0
    ? undefined
    : normalizedValue;
}

function parseSentryDsn(value: string): string {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username.length === 0 ||
      url.hostname.length === 0 ||
      url.pathname === "/"
    ) {
      throw new Error("Invalid DSN");
    }

    return url.toString();
  } catch {
    throw new Error("Invalid Sentry runtime configuration: dsn");
  }
}

function parseSentryEnvironment(value: string | undefined): SentryEnvironment {
  const environment = SENTRY_ENVIRONMENTS.find((candidate) => candidate === value);

  if (environment === undefined) {
    throw new Error("Invalid Sentry runtime configuration: environment");
  }

  return environment;
}

export function resolveSentryRuntimeConfig(
  options: ResolveSentryRuntimeConfigOptions,
): ResolvedSentryRuntimeConfig {
  const dsnValue = normalizeOptionalValue(options.dsn);

  // DSN is the feature flag: without it, Sentry is fully disabled.
  if (dsnValue === undefined) {
    return Object.freeze({
      enabled: false,
    });
  }

  const environment = parseSentryEnvironment(normalizeOptionalValue(options.environment));
  const release = normalizeOptionalValue(options.release);

  if (release === undefined) {
    throw new Error("Invalid Sentry runtime configuration: release");
  }

  const dsn = parseSentryDsn(dsnValue);
  const requestId = normalizeOptionalValue(options.requestId);
  const policy = createSentryEventPolicy({
    application: options.application,
    runtime: options.runtime,
    environment,
    release,
    ...(requestId === undefined ? {} : { requestId }),
  });

  return Object.freeze({
    enabled: true,
    dsn,
    policy,
  });
}
