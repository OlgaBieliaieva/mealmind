export type LogFields = Readonly<Record<string, unknown>>;

export interface AppLogger {
  debug(fields: LogFields, message: string): void;
  info(fields: LogFields, message: string): void;
  warn(fields: LogFields, message: string): void;
  error(fields: LogFields, message: string): void;
  child(bindings: LogFields): AppLogger;
}

export function createNoopLogger(): AppLogger {
  const logger: AppLogger = {
    debug(): void {
      return;
    },

    info(): void {
      return;
    },

    warn(): void {
      return;
    },

    error(): void {
      return;
    },

    child(): AppLogger {
      return logger;
    },
  };

  return Object.freeze(logger);
}
