import { config as loadEnvironment } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const packageDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(packageDirectory, "../..");

loadEnvironment({
  path: resolve(repositoryRoot, ".env"),
});

const schemaOnlyDatabaseUrl = "postgresql://unavailable:unavailable@127.0.0.1:1/unavailable";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seeds/reference/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? schemaOnlyDatabaseUrl,
  },
});
