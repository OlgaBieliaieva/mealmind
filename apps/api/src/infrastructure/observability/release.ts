const gitSha =
  process.env.RENDER_GIT_COMMIT?.trim() ||
  process.env.GITHUB_SHA?.trim() ||
  process.env.VERCEL_GIT_COMMIT_SHA?.trim();

export function resolveApiRelease(): string | undefined {
  const explicitRelease = process.env.SENTRY_RELEASE?.trim();

  if (explicitRelease) {
    return explicitRelease;
  }

  if (!gitSha) {
    return undefined;
  }

  return `api@${gitSha}`;
}
