import path from "node:path";
import { pathToFileURL } from "node:url";

import { AGGREGATE_PRODUCTS_USAGE, runAggregateProductsCommand } from "./aggregate-products.js";
import { RAW_VALIDATION_USAGE, runRawValidationCommand } from "./validate-raw.js";

export type ZakazCommand = "validate-raw" | "aggregate";

export const ZAKAZ_USAGE = `MealMind Zakaz catalog pipeline

Usage:
  npm run zakaz -- <command> [options]
  npm run zakaz -- validate-raw --locale en
  npm run zakaz -- aggregate --locale en

Available commands:
  validate-raw   Перевірити структуру, pagination і consistency локальних raw JSON.
  aggregate      Об'єднати product observations у записи за store + SKU.

Options:
  --help, -h     Показати цю довідку.
`;

export function resolveZakazCommand(argument: string): ZakazCommand {
  if (argument === "validate-raw" || argument === "aggregate") return argument;

  throw new Error(
    `Невідома Zakaz команда: "${argument}". Запустіть "npm run zakaz -- --help" для довідки.`,
  );
}

export async function runZakazCli(arguments_: readonly string[]): Promise<number> {
  const [commandArgument, ...commandArguments] = arguments_;
  if (!commandArgument || commandArgument === "--help" || commandArgument === "-h") {
    process.stdout.write(ZAKAZ_USAGE);
    return 0;
  }

  const command = resolveZakazCommand(commandArgument);
  switch (command) {
    case "validate-raw": {
      if (commandArguments.includes("--help") || commandArguments.includes("-h")) {
        process.stdout.write(RAW_VALIDATION_USAGE);
        return 0;
      }

      const result = await runRawValidationCommand(commandArguments);
      return result.valid ? 0 : 1;
    }

    case "aggregate": {
      if (commandArguments.includes("--help") || commandArguments.includes("-h")) {
        process.stdout.write(AGGREGATE_PRODUCTS_USAGE);
        return 0;
      }

      return (await runAggregateProductsCommand(commandArguments)) ? 0 : 1;
    }

    default: {
      const exhaustiveCheck: never = command;
      throw new Error(`Непідтримувана Zakaz команда: ${String(exhaustiveCheck)}`);
    }
  }
}

async function main(): Promise<void> {
  process.exitCode = await runZakazCli(process.argv.slice(2));
}

const entryPoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (entryPoint === import.meta.url) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Zakaz pipeline failed: ${message}\n`);
    process.exitCode = 1;
  });
}
