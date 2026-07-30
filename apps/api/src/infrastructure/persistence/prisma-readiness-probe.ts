import type { DatabaseClient } from "@mealmind/db";

import type { ReadinessProbe } from "../../application/readiness.js";

export function createPrismaReadinessProbe(database: DatabaseClient): ReadinessProbe {
  const probe: ReadinessProbe = {
    async check(): Promise<void> {
      await database.$queryRaw`SELECT 1`;
    },
  };

  return Object.freeze(probe);
}
