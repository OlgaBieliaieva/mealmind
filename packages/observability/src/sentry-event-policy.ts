export const SENTRY_APPLICATIONS = ["web-client", "web-admin", "api"] as const;

export const SENTRY_RUNTIMES = ["browser", "node", "edge"] as const;

export const SENTRY_ENVIRONMENTS = ["preview", "staging", "production"] as const;

export type SentryApplication = (typeof SENTRY_APPLICATIONS)[number];
export type SentryRuntime = (typeof SENTRY_RUNTIMES)[number];
export type SentryEnvironment = (typeof SENTRY_ENVIRONMENTS)[number];

export interface SentryEventTags {
  readonly application: SentryApplication;
  readonly runtime: SentryRuntime;
  readonly request_id?: string;
}

export interface SentryEventPolicy {
  readonly environment: SentryEnvironment;
  readonly release: string;
  readonly tags: SentryEventTags;
  readonly sendDefaultPii: false;
  readonly tracesSampleRate: 0;
}

export interface CreateSentryEventPolicyOptions {
  readonly application: SentryApplication;
  readonly runtime: SentryRuntime;
  readonly environment: SentryEnvironment;
  readonly release: string;
  readonly requestId?: string;
}

const FILTERED_VALUE = "[Filtered]";

const SAFE_HEADER_NAMES = new Set([
  "accept",
  "content-length",
  "content-type",
  "x-correlation-id",
  "x-request-id",
]);

const REQUEST_PAYLOAD_FIELDS = new Set(["body", "cookies", "data", "query", "querystring"]);

const SENSITIVE_FIELDS = new Set([
  "accesstoken",
  "allergen",
  "allergens",
  "allergies",
  "allergy",
  "apikey",
  "authorization",
  "birthdate",
  "bmi",
  "consumption",
  "consumptiondiary",
  "cookie",
  "databaseurl",
  "dateofbirth",
  "displayname",
  "email",
  "firstname",
  "fullname",
  "height",
  "heightcm",
  "idtoken",
  "ipaddress",
  "lastname",
  "medicalcondition",
  "medicalconditions",
  "medicaldata",
  "name",
  "nutrition",
  "nutrients",
  "nutrienttargets",
  "password",
  "passwordhash",
  "proxyauthorization",
  "refreshtoken",
  "remoteaddress",
  "secret",
  "servicekey",
  "servicerolekey",
  "setcookie",
  "supabasesecretkey",
  "supabaseservicerolekey",
  "token",
  "user",
  "weight",
  "weightkg",
]);

const OMITTED_TECHNICAL_FIELDS = new Set(["attachments", "vars"]);

const SENSITIVE_TEXT_PATTERNS: readonly Readonly<{
  pattern: RegExp;
  replacement: string;
}>[] = [
  {
    pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]+/giu,
    replacement: `Bearer ${FILTERED_VALUE}`,
  },
  {
    pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*\b/gu,
    replacement: FILTERED_VALUE,
  },
  {
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
    replacement: "[Filtered email]",
  },
  {
    pattern:
      /([?&](?:access[_-]?token|refresh[_-]?token|id[_-]?token|token|code|key|secret)=)[^&#\s]*/giu,
    replacement: `$1${FILTERED_VALUE}`,
  },
];

function normalizeFieldName(fieldName: string): string {
  return fieldName.toLowerCase().replaceAll(/[^a-z0-9]/gu, "");
}

function requireNonBlank(value: string, fieldName: string): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${fieldName} must not be empty`);
  }

  return normalizedValue;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function isSensitiveField(fieldName: string): boolean {
  return (
    SENSITIVE_FIELDS.has(fieldName) ||
    fieldName.includes("password") ||
    fieldName.endsWith("token") ||
    fieldName.endsWith("secret")
  );
}

function sanitizeText(value: string): string {
  return SENSITIVE_TEXT_PATTERNS.reduce(
    (sanitizedValue, { pattern, replacement }) => sanitizedValue.replace(pattern, replacement),
    value,
  );
}

function stripQueryAndFragment(value: string): string {
  const suffixStart = value.search(/[?#]/u);

  return suffixStart === -1 ? value : value.slice(0, suffixStart);
}

function shouldOmitField(fieldName: string, containerName: string | undefined): boolean {
  if (isSensitiveField(fieldName) || OMITTED_TECHNICAL_FIELDS.has(fieldName)) {
    return true;
  }

  return containerName === "request" && REQUEST_PAYLOAD_FIELDS.has(fieldName);
}

function sanitizeHeaders(
  headers: Record<string, unknown>,
  seenValues: WeakMap<object, unknown>,
): Record<string, unknown> {
  if (seenValues.has(headers)) {
    return seenValues.get(headers) as Record<string, unknown>;
  }

  const sanitizedHeaders: Record<string, unknown> = {};

  seenValues.set(headers, sanitizedHeaders);

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (!SAFE_HEADER_NAMES.has(headerName.toLowerCase())) {
      continue;
    }

    sanitizedHeaders[headerName] = sanitizeValue(
      headerValue,
      seenValues,
      normalizeFieldName(headerName),
    );
  }

  return sanitizedHeaders;
}

function sanitizeValue(
  value: unknown,
  seenValues: WeakMap<object, unknown>,
  containerName?: string,
): unknown {
  if (typeof value === "string") {
    return sanitizeText(value);
  }

  if (Array.isArray(value)) {
    if (seenValues.has(value)) {
      return seenValues.get(value);
    }

    const sanitizedArray: unknown[] = [];

    seenValues.set(value, sanitizedArray);

    for (const item of value) {
      sanitizedArray.push(sanitizeValue(item, seenValues, containerName));
    }

    return sanitizedArray;
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  if (seenValues.has(value)) {
    return seenValues.get(value);
  }

  const sanitizedRecord: Record<string, unknown> = {};

  seenValues.set(value, sanitizedRecord);

  for (const [fieldName, fieldValue] of Object.entries(value)) {
    const normalizedFieldName = normalizeFieldName(fieldName);

    if (shouldOmitField(normalizedFieldName, containerName)) {
      continue;
    }

    if (normalizedFieldName === "headers" && isPlainRecord(fieldValue)) {
      sanitizedRecord[fieldName] = sanitizeHeaders(fieldValue, seenValues);
      continue;
    }

    if (normalizedFieldName === "url" && typeof fieldValue === "string") {
      sanitizedRecord[fieldName] = stripQueryAndFragment(fieldValue);
      continue;
    }

    sanitizedRecord[fieldName] = sanitizeValue(fieldValue, seenValues, normalizedFieldName);
  }

  return sanitizedRecord;
}

export function createSentryRelease(application: SentryApplication, gitSha: string): string {
  return `${application}@${requireNonBlank(gitSha, "gitSha")}`;
}

export function createSentryEventPolicy(
  options: CreateSentryEventPolicyOptions,
): SentryEventPolicy {
  const release = requireNonBlank(options.release, "release");
  const expectedReleasePrefix = `${options.application}@`;

  if (
    !release.startsWith(expectedReleasePrefix) ||
    release.length === expectedReleasePrefix.length
  ) {
    throw new Error(`release must follow the ${expectedReleasePrefix}<git-sha> format`);
  }

  const requestId = options.requestId?.trim();

  const tags: SentryEventTags =
    requestId === undefined || requestId.length === 0
      ? {
          application: options.application,
          runtime: options.runtime,
        }
      : {
          application: options.application,
          runtime: options.runtime,
          request_id: requestId,
        };

  return Object.freeze({
    environment: options.environment,
    release,
    tags: Object.freeze(tags),
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export function sanitizeSentryEvent<TEvent extends object>(event: TEvent): TEvent {
  return sanitizeValue(event, new WeakMap<object, unknown>()) as TEvent;
}
