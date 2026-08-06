import { USDA_PATHS } from "./paths.js";
import { selectFoods } from "./select-foods.js";
import type { UsdaCommand } from "./types.js";
import { verifyUsdaFramework } from "./verify-framework.js";
import { writeJsonFile } from "./write-json.js";

function printUsage(): void {
  console.info(`
MealMind USDA import pipeline

Usage:
  npm run usda
  npm run usda -- check
  npm run usda -- select
  npm run usda:check
  npm run usda:select

Available commands:
  check    Verify the local USDA framework and required directories.
  select   Select Foundation Foods and SR Legacy records from food.csv.
`);
}

function resolveCommand(argument: string | undefined): UsdaCommand {
  if (!argument || argument === "check") {
    return "check";
  }

  if (argument === "select") {
    return "select";
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

async function runSelect(): Promise<void> {
  await verifyUsdaFramework();

  console.info("Selecting supported USDA foods...\n");

  console.info("Input files:");
  console.info(`  food:            ${USDA_PATHS.foodFile}`);
  console.info(`  foundation food: ${USDA_PATHS.foundationFoodFile}`);
  console.info(`  SR Legacy:       ${USDA_PATHS.srLegacyFoodFile}`);

  const document = await selectFoods({
    foodFile: USDA_PATHS.foodFile,
    foundationFoodFile: USDA_PATHS.foundationFoodFile,
    srLegacyFoodFile: USDA_PATHS.srLegacyFoodFile,
  });

  await writeJsonFile(USDA_PATHS.selectedFoodsFile, document);

  console.info("\nSelection completed:");
  console.info(`  food.csv rows read:  ${document.statistics.foodRowsRead}`);
  console.info(`  Foundation Foods:    ${document.statistics.selectedFoundationFoods}`);
  console.info(`  SR Legacy foods:     ${document.statistics.selectedSrLegacyFoods}`);
  console.info(`  selected total:      ${document.statistics.selectedFoodsTotal}`);
  console.info(`\nOutput: ${USDA_PATHS.selectedFoodsFile}`);
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

    case "select":
      await runSelect();
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
