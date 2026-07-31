import { initializeWebSentry } from "@/observability/sentry";

const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN;

const configuredRelease = process.env.SENTRY_RELEASE?.trim();
const gitSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim() || process.env.GITHUB_SHA?.trim();

const release =
  configuredRelease && configuredRelease.length > 0
    ? configuredRelease
    : gitSha
      ? `web-admin@${gitSha}`
      : undefined;

initializeWebSentry({
  application: "web-admin",
  runtime: "edge",
  dsn,
  environment: process.env.SENTRY_ENVIRONMENT,
  release,
});
