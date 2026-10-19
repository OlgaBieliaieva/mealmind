import path from "node:path";

import { validateZakazRawDataset } from "./raw-validator.js";

export interface RawValidationCliOptions {
  readonly rootDirectory: string;
  readonly locale?: string;
  readonly pageSize: number;
  readonly json: boolean;
}

export async function runRawValidationCommand(
  arguments_: readonly string[],
): Promise<Awaited<ReturnType<typeof validateZakazRawDataset>>> {
  const options = parseRawValidationArguments(arguments_);
  const result = await validateZakazRawDataset({
    rootDirectory: options.rootDirectory,
    ...(options.locale ? { locale: options.locale } : {}),
    pageSize: options.pageSize,
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printHumanReadableResult(result);
  }

  return result;
}

export function parseRawValidationArguments(
  arguments_: readonly string[],
): RawValidationCliOptions {
  let rootDirectory = path.resolve("scripts/zakaz/data/raw");
  let locale: string | undefined;
  let pageSize = 30;
  let json = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--root") {
      rootDirectory = path.resolve(requireValue(arguments_, ++index, "--root"));
      continue;
    }
    if (argument === "--locale") {
      locale = requireValue(arguments_, ++index, "--locale");
      continue;
    }
    if (argument === "--page-size") {
      pageSize = Number(requireValue(arguments_, ++index, "--page-size"));
      if (!Number.isSafeInteger(pageSize) || pageSize <= 0) {
        throw new Error("--page-size має бути додатним цілим числом");
      }
      continue;
    }
    throw new Error(`Невідомий аргумент: ${argument}`);
  }

  return {
    rootDirectory,
    ...(locale ? { locale } : {}),
    pageSize,
    json,
  };
}

function requireValue(arguments_: readonly string[], index: number, option: string): string {
  const value = arguments_[index];
  if (!value) throw new Error(`Для ${option} потрібно передати значення`);
  return value;
}

function printHumanReadableResult(
  result: Awaited<ReturnType<typeof validateZakazRawDataset>>,
): void {
  const { summary } = result;
  process.stdout.write(
    [
      `Zakaz raw validation: ${result.valid ? "OK" : "FAILED"}`,
      `Locales: ${summary.locales}`,
      `Stores: ${summary.stores}`,
      `Categories: ${summary.categories}`,
      `Pages: ${summary.pages}`,
      `Product rows: ${summary.productRows}`,
      `Errors: ${summary.errors}`,
      `Warnings: ${summary.warnings}`,
    ].join("\n") + "\n",
  );

  for (const issue of result.issues) {
    process.stdout.write(`[${issue.severity}] ${issue.code} ${issue.file}: ${issue.message}\n`);
  }
}

export const RAW_VALIDATION_USAGE = `Перевірка локальних Zakaz raw JSON.

Usage:
  npm run zakaz -- validate-raw [options]

Options:
  --root <path>       Raw root (default: scripts/zakaz/data/raw)
  --locale <locale>   Перевірити лише одну локаль, наприклад en або uk
  --page-size <n>     Розмір сторінки API (default: 30)
  --json              Вивести machine-readable JSON
  --help              Показати цю довідку
`;
