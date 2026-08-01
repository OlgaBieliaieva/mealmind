import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const application = "web-client";

function readOptionalValue(value: string | undefined): string {
  return value?.trim() ?? "";
}

const sentryEnvironment = readOptionalValue(process.env.SENTRY_ENVIRONMENT);

const configuredRelease = readOptionalValue(process.env.SENTRY_RELEASE);

const gitSha =
  readOptionalValue(process.env.VERCEL_GIT_COMMIT_SHA) || readOptionalValue(process.env.GITHUB_SHA);

const sentryRelease = configuredRelease || (gitSha ? `${application}@${gitSha}` : "");

const runtimeDsn =
  readOptionalValue(process.env.NEXT_PUBLIC_SENTRY_DSN) ||
  readOptionalValue(process.env.SENTRY_DSN);

const sourceMapUploadEnabled = Boolean(
  runtimeDsn &&
  sentryEnvironment &&
  sentryRelease &&
  readOptionalValue(process.env.SENTRY_ORG) &&
  readOptionalValue(process.env.SENTRY_PROJECT) &&
  readOptionalValue(process.env.SENTRY_AUTH_TOKEN),
);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  env: {
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: sentryEnvironment,
    NEXT_PUBLIC_SENTRY_RELEASE: sentryRelease,
  },
};

export default withSentryConfig(nextConfig, {
  telemetry: false,
  silent: !sourceMapUploadEnabled,
  widenClientFileUpload: sourceMapUploadEnabled,
  sourcemaps: {
    disable: !sourceMapUploadEnabled,
    deleteSourcemapsAfterUpload: true,
  },
  ...(sentryRelease
    ? {
        release: {
          name: sentryRelease,
        },
      }
    : {}),
});
