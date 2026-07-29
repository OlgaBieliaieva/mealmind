export function parseBearerToken(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }

  const match = /^Bearer[ \t]+(\S+)$/i.exec(authorizationHeader.trim());

  if (match === null) {
    return null;
  }

  return match[1] ?? null;
}
