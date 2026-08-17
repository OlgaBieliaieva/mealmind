import { z } from "zod";

const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;

      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Must use the HTTP or HTTPS protocol");

const httpOriginSchema = httpUrlSchema.transform((value) => new URL(value).origin);

const databaseUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "Must be a PostgreSQL connection URL",
  );

const corsAllowedOriginsSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  )
  .pipe(z.array(httpOriginSchema).min(1))
  .transform((origins) => [...new Set(origins)]);

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().min(1).max(65_535),
  API_ORIGIN: httpOriginSchema,
  CORS_ALLOWED_ORIGINS: corsAllowedOriginsSchema,
  DATABASE_URL: databaseUrlSchema,
  SUPABASE_URL: httpUrlSchema,
  SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
  SUPABASE_SECRET_KEY: z.string().trim().min(1),
  INVITATION_APP_ORIGIN: httpOriginSchema,
  INVITATION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(72),
  RESEND_FROM_EMAIL: z.string().trim().min(3).max(320),
  RESEND_API_KEY: z.string().trim().min(1),
});

export interface ApiConfig {
  readonly nodeEnv: "development" | "test" | "production";
  readonly port: number;
  readonly apiOrigin: string;
  readonly corsAllowedOrigins: readonly string[];
  readonly databaseUrl: string;
  readonly supabase: {
    readonly url: string;
    readonly publishableKey: string;
    readonly secretKey: string;
  };
  readonly invitations: {
    readonly appOrigin: string;
    readonly ttlHours: number;
    readonly resendFromEmail: string;
    readonly resendApiKey: string;
  };
}

function getInvalidVariableNames(error: z.ZodError): string[] {
  return [
    ...new Set(
      error.issues.map((issue) => {
        const [variableName] = issue.path;

        return typeof variableName === "string" ? variableName : "unknown variable";
      }),
    ),
  ];
}

export function parseApiEnv(environment: NodeJS.ProcessEnv): ApiConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const invalidVariables = getInvalidVariableNames(result.error);

    throw new Error(`Invalid API environment variables: ${invalidVariables.join(", ")}`);
  }

  const config: ApiConfig = {
    nodeEnv: result.data.NODE_ENV,
    port: result.data.PORT,
    apiOrigin: result.data.API_ORIGIN,
    corsAllowedOrigins: Object.freeze([...result.data.CORS_ALLOWED_ORIGINS]),
    databaseUrl: result.data.DATABASE_URL,
    supabase: Object.freeze({
      url: result.data.SUPABASE_URL,
      publishableKey: result.data.SUPABASE_PUBLISHABLE_KEY,
      secretKey: result.data.SUPABASE_SECRET_KEY,
    }),
    invitations: Object.freeze({
      appOrigin: result.data.INVITATION_APP_ORIGIN,
      ttlHours: result.data.INVITATION_TTL_HOURS,
      resendFromEmail: result.data.RESEND_FROM_EMAIL,
      resendApiKey: result.data.RESEND_API_KEY,
    }),
  };

  return Object.freeze(config);
}
