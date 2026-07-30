import type { Server } from "node:http";

import type { AppLogger } from "../application/logging/logger.js";

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

export interface GracefulShutdownOptions {
  readonly server: Server;
  readonly logger: AppLogger;
  readonly dispose: () => Promise<void>;
  readonly timeoutMs?: number;
}

function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function closeHttpServer(server: Server, logger: AppLogger, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const forceCloseTimer = setTimeout(() => {
      logger.warn(
        {
          timeoutMs,
        },
        "Graceful shutdown deadline reached",
      );

      server.closeAllConnections();
    }, timeoutMs);

    forceCloseTimer.unref();

    server.close((error?: Error) => {
      clearTimeout(forceCloseTimer);

      if (error !== undefined) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function registerGracefulShutdown(options: GracefulShutdownOptions): void {
  const timeoutMs = options.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;

  let shutdownPromise: Promise<void> | null = null;

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (shutdownPromise !== null) {
      return shutdownPromise;
    }

    shutdownPromise = (async () => {
      options.logger.info(
        {
          signal,
        },
        "API shutdown started",
      );

      try {
        await closeHttpServer(options.server, options.logger, timeoutMs);
      } finally {
        await options.dispose();
      }

      options.logger.info(
        {
          signal,
        },
        "API shutdown completed",
      );
    })();

    return shutdownPromise;
  }

  function handleSignal(signal: NodeJS.Signals): void {
    shutdown(signal).catch((error: unknown) => {
      options.logger.error(
        {
          signal,
          errorName: getErrorName(error),
        },
        "API shutdown failed",
      );

      process.exitCode = 1;
    });
  }

  process.once("SIGTERM", () => {
    handleSignal("SIGTERM");
  });

  process.once("SIGINT", () => {
    handleSignal("SIGINT");
  });
}
