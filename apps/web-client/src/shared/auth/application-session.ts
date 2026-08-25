interface ErrorEnvelope {
  readonly error?: { readonly code?: unknown };
}

type FetchApplicationSession = (input: string, init: RequestInit) => Promise<Response>;

async function requiresAccountBootstrap(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;

  try {
    const payload = (await response.clone().json()) as ErrorEnvelope;
    return payload.error?.code === "ACCOUNT_ACCESS_DENIED";
  } catch {
    return false;
  }
}

export async function readOrBootstrapApplicationSession(
  apiUrl: string,
  accessToken: string,
  fetchSession: FetchApplicationSession = fetch,
): Promise<Response> {
  const apiBase = apiUrl.replace(/\/+$/, "");
  const headers = {
    accept: "application/json",
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  };
  const readSession = () =>
    fetchSession(`${apiBase}/api/v1/session`, {
      headers,
      cache: "no-store",
    });

  const current = await readSession();
  if (!(await requiresAccountBootstrap(current))) return current;

  const bootstrap = await fetchSession(`${apiBase}/api/v1/account/bootstrap`, {
    method: "POST",
    headers,
    body: "{}",
    cache: "no-store",
  });
  if (!bootstrap.ok) return bootstrap;

  return readSession();
}
