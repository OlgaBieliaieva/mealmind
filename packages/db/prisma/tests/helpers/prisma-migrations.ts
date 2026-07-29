import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import type { TestDatabaseTarget } from "./test-database.js";

const execFileAsync = promisify(execFile);
const moduleRequire = createRequire(import.meta.url);

const prismaCliPath = moduleRequire.resolve("prisma/build/index.js");

const helperDirectory = dirname(fileURLToPath(import.meta.url));

const databasePackageDirectory = resolve(helperDirectory, "../../..");

export async function deployMigrations(target: TestDatabaseTarget): Promise<void> {
  const result = await execFileAsync(process.execPath, [prismaCliPath, "migrate", "deploy"], {
    cwd: databasePackageDirectory,
    env: {
      ...process.env,
      DIRECT_URL: target.connectionString,
      DATABASE_URL: target.connectionString,
    },
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });

  const output = [result.stdout, result.stderr]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n");

  if (output.length > 0) {
    console.info(output);
  }
}
