import { verifyUsdaFramework } from "./verify-framework.js";
import type { UsdaCommand } from "./types.js";

function printUsage(): void {
  console.info(`
MealMind USDA import pipeline

Usage:
  npm run usda
  npm run usda -- check
  npm run usda:check

Available commands:
  check   Verify the local USDA framework and required directories.
`);
}

function resolveCommand(argument: string | undefined): UsdaCommand {
  if (!argument || argument === "check") {
    return "check";
  }

  throw new Error(`Unknown USDA command: "${argument}". Run "npm run usda -- --help" for usage.`);
}

async function runCheck(): Promise<void> {
  console.info("Checking MealMind USDA import framework...\n");

  const result = await verifyUsdaFramework();

  console.info("Framework directories:");

  console.info(`  package root: ${result.frameworkInfo.packageRoot}`);
  console.info(`  USDA root:    ${result.frameworkInfo.usdaRoot}`);
  console.info(`  raw data:     ${result.frameworkInfo.rawDataDirectory}`);
  console.info(`  work data:    ${result.frameworkInfo.workDataDirectory}`);
  console.info(`  output data:  ${result.frameworkInfo.outputDataDirectory}`);

  if (result.createdDirectories.length > 0) {
    console.info("\nCreated directories:");

    for (const directoryPath of result.createdDirectories) {
      console.info(`  + ${directoryPath}`);
    }
  } else {
    console.info("\nAll required directories already exist.");
  }

  console.info("\nUSDA import framework is ready.");
}

async function main(): Promise<void> {
  const argument = process.argv[2];

  if (argument === "--help" || argument === "-h") {
    printUsage();
    return;
  }

  const command = resolveCommand(argument);

  switch (command) {
    case "check":
      await runCheck();
      return;

    default: {
      const exhaustiveCheck: never = command;
      throw new Error(`Unsupported USDA command: ${String(exhaustiveCheck)}`);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error("\nUSDA pipeline failed:");
  console.error(message);

  process.exitCode = 1;
});
