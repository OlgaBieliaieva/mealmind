import { createDatabaseClient } from "@mealmind/db";

import { parseApiEnv } from "../../../config/env.js";
import { createProductService } from "../application/product-service.js";
import { PRODUCT_MEDIA_BUCKET } from "../product-module.js";
import { createPrismaProductRepository } from "../infrastructure/prisma-product-repository.js";
import { createSupabaseProductMediaStorage } from "../infrastructure/supabase-product-media-storage.js";

const config = parseApiEnv(process.env);
const database = createDatabaseClient({ connectionString: config.databaseUrl, log: ["error"] });

try {
  const retentionHours = readRetentionHours(process.argv.slice(2));
  const dryRun = process.argv.includes("--dry-run");
  const repository = createPrismaProductRepository(database);
  const storage = createSupabaseProductMediaStorage({
    url: config.supabase.url,
    secretKey: config.supabase.secretKey,
    bucket: PRODUCT_MEDIA_BUCKET,
  });
  const service = createProductService(repository, storage);
  const result = await service.cleanupOrphanedMedia({
    olderThan: new Date(Date.now() - retentionHours * 60 * 60 * 1000),
    dryRun,
  });

  console.log(JSON.stringify({ event: "product_media_cleanup", retentionHours, ...result }));
  if (result.failed > 0) process.exitCode = 1;
} finally {
  await database.$disconnect();
}

function readRetentionHours(arguments_: readonly string[]): number {
  const raw = arguments_.find((argument) => argument.startsWith("--retention-hours="));
  if (raw === undefined) return 24;

  const value = Number(raw.split("=")[1]);
  if (!Number.isInteger(value) || value < 1 || value > 24 * 30) {
    throw new Error("--retention-hours must be an integer from 1 to 720");
  }
  return value;
}
