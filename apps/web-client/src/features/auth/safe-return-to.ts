const CONTROL_OR_BACKSLASH = /[\\\u0000-\u001f\u007f]/;

export function sanitizeReturnTo(value: string | null | undefined, fallback = "/"): string {
  if (
    value === null ||
    value === undefined ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    CONTROL_OR_BACKSLASH.test(value)
  ) {
    return fallback;
  }

  try {
    const base = new URL("https://mealmind.invalid");
    const resolved = new URL(value, base);

    if (resolved.origin !== base.origin) {
      return fallback;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
