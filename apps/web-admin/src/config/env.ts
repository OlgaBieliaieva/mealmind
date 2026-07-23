import { z } from "zod";

const publicUrlSchema = z
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

const environmentSchema = z.object({
  NEXT_PUBLIC_API_URL: publicUrlSchema,
  NEXT_PUBLIC_SUPABASE_URL: publicUrlSchema,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
});

export interface PublicWebEnvironment {
  readonly NEXT_PUBLIC_API_URL: string | undefined;
  readonly NEXT_PUBLIC_SUPABASE_URL: string | undefined;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string | undefined;
}

export interface WebConfig {
  readonly apiUrl: string;
  readonly supabase: {
    readonly url: string;
    readonly publishableKey: string;
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

export function parseWebEnv(environment: PublicWebEnvironment): WebConfig {
  const result = environmentSchema.safeParse(environment);

  if (!result.success) {
    const invalidVariables = getInvalidVariableNames(result.error);

    throw new Error(`Invalid web-admin environment variables: ${invalidVariables.join(", ")}`);
  }

  const config: WebConfig = {
    apiUrl: result.data.NEXT_PUBLIC_API_URL,
    supabase: Object.freeze({
      url: result.data.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    }),
  };

  return Object.freeze(config);
}

export function readWebEnv(): WebConfig {
  return parseWebEnv({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
