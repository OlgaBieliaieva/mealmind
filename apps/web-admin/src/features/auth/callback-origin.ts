const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function resolveCallbackOrigin(
  requestUrl: string,
  configuredOrigin: string,
  development: boolean,
): string {
  const configured = new URL(configuredOrigin);
  if (!development) return configured.origin;

  const requested = new URL(requestUrl);
  return LOOPBACK_HOSTS.has(configured.hostname) &&
    LOOPBACK_HOSTS.has(requested.hostname) &&
    requested.port === configured.port &&
    requested.protocol === configured.protocol
    ? requested.origin
    : configured.origin;
}
