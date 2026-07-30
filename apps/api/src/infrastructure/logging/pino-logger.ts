import pino, { type Logger as PinoLogger } from "pino";

import type { AppLogger, LogFields } from "../../application/logging/logger.js";

export interface PinoLoggerOptions {
  readonly environment: "development" | "test" | "production";
}

const redactedPaths = [
  "authorization",
  "cookie",
  "password",
  "passwordHash",
  "accessToken",
  "refreshToken",
  "token",
  "secret",
  "secretKey",
  "databaseUrl",
  "connectionString",
  "supabase.secretKey",
];

function wrapPinoLogger(logger: PinoLogger): AppLogger {
  const adapter: AppLogger = {
    debug(fields: LogFields, message: string) {
      logger.debug(fields, message);
    },

    info(fields: LogFields, message: string) {
      logger.info(fields, message);
    },

    warn(fields: LogFields, message: string) {
      logger.warn(fields, message);
    },

    error(fields: LogFields, message: string) {
      logger.error(fields, message);
    },

    child(bindings: LogFields): AppLogger {
      return wrapPinoLogger(logger.child(bindings));
    },
  };

  return Object.freeze(adapter);
}

export function createPinoLogger(options: PinoLoggerOptions): AppLogger {
  const logger = pino({
    level: options.environment === "development" ? "debug" : "info",
    base: {
      service: "mealmind-api",
      environment: options.environment,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: redactedPaths,
      censor: "[REDACTED]",
    },
  });

  return wrapPinoLogger(logger);
}
