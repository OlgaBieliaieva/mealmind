import { USDA_PATHS } from "./paths.js";
import { selectFoods } from "./select-foods.js";
import { verifyUsdaFramework } from "./verify-framework.js";
import { writeJsonFile } from "./write-json.js";
import { normalizeFoods } from "./normalize-foods.js";
import { readJsonFile } from "./read-json.js";
import { buildCatalogReview } from "./build-catalog-review.js";
import { buildCuratedCatalog } from "./build-curated-catalog.js";
import { runNutrientExtraction } from "./run-nutrient-extraction.js";
import { runPortionExtraction } from "./run-portion-extraction.js";
import { runPortionNormalization } from "./run-portion-normalization.js";
import type {
  CatalogReviewDocument,
  NormalizedProductsDocument,
  SelectedFoodsDocument,
  UsdaCommand,
} from "./types.js";

function printUsage(): void {
  console.info(`
MealMind USDA import pipeline

Usage:
  npm run usda
  npm run usda -- check
  npm run usda -- select
  npm run usda -- normalize
  npm run usda -- review
  npm run usda -- curate
  npm run usda -- curate --strict
  npm run usda -- nutrients
  npm run usda -- portions
  npm run usda -- normalize-portions

Available commands:
  check       Verify framework directories.
  select      Select Foundation Foods and SR Legacy records.
  normalize   Normalize selected USDA food descriptions.
  review      Generate catalog-review.json with curation decisions.
  curate      Generate curated-products.json from included products.
  nutrients   Extract MealMind-supported nutrients for curated products.
  portions    Extract USDA serving measures for nutrient-ready products.
  normalize-portions
            Normalize and filter extracted USDA portions.

Options:
  --strict    Fail curate when NEEDS_REVIEW products remain.
`);
}

function resolveCommand(argument: string | undefined): UsdaCommand {
  if (!argument || argument === "check") {
    return "check";
  }

  if (argument === "select") {
    return "select";
  }

  if (argument === "normalize") {
    return "normalize";
  }

  if (argument === "review") {
    return "review";
  }

  if (argument === "curate") {
    return "curate";
  }

  if (argument === "nutrients") {
    return "nutrients";
  }

  if (argument === "portions") {
    return "portions";
  }

  if (argument === "normalize-portions") {
    return "normalize-portions";
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

async function runNormalize(): Promise<void> {
  await verifyUsdaFramework();

  console.info("Normalizing selected USDA foods...\n");

  console.info(`Input:  ${USDA_PATHS.selectedFoodsFile}`);
  console.info(`Output: ${USDA_PATHS.normalizedProductsFile}`);

  const selectedFoods = await readJsonFile<SelectedFoodsDocument>(USDA_PATHS.selectedFoodsFile);

  const document = normalizeFoods(selectedFoods);

  await writeJsonFile(USDA_PATHS.normalizedProductsFile, document);

  console.info("\nNormalization completed:");
  console.info(`  input foods:             ${document.statistics.inputFoodsTotal}`);
  console.info(`  normalized foods:        ${document.statistics.normalizedFoodsTotal}`);
  console.info(`  raw:                     ${document.statistics.rawFoods}`);
  console.info(`  cooked:                  ${document.statistics.cookedFoods}`);
  console.info(`  processed:               ${document.statistics.processedFoods}`);
  console.info(`  ready to eat:            ${document.statistics.readyToEatFoods}`);
  console.info(`  unspecified:             ${document.statistics.unspecifiedFoods}`);
  console.info(`  with modifiers:          ${document.statistics.foodsWithModifiers}`);
  console.info(`  with unclassified parts: ${document.statistics.foodsWithUnclassifiedParts}`);

  console.info(`\nOutput: ${USDA_PATHS.normalizedProductsFile}`);
}

async function runReview(): Promise<void> {
  await verifyUsdaFramework();

  console.info("Building USDA catalog review...\n");

  const normalized = await readJsonFile<NormalizedProductsDocument>(
    USDA_PATHS.normalizedProductsFile,
  );

  const review = buildCatalogReview(normalized);

  await writeJsonFile(USDA_PATHS.catalogReviewFile, review);

  console.info("Catalog review completed:");
  console.info(`  input products:        ${review.statistics.inputProductsTotal}`);
  console.info(`  final includes:        ${review.statistics.finalIncludes}`);
  console.info(`  final excludes:        ${review.statistics.finalExcludes}`);
  console.info(`  needs review:          ${review.statistics.finalNeedsReview}`);
  console.info(`  manual overrides:      ${review.statistics.overriddenProducts}`);
  console.info(`\nOutput: ${USDA_PATHS.catalogReviewFile}`);
}

async function runCurate(strict: boolean): Promise<void> {
  await verifyUsdaFramework();

  console.info("Building curated USDA catalog...\n");

  const review = await readJsonFile<CatalogReviewDocument>(USDA_PATHS.catalogReviewFile);

  const curated = buildCuratedCatalog(review, {
    strict,
  });

  await writeJsonFile(USDA_PATHS.curatedProductsFile, curated);

  console.info("Curated catalog completed:");
  console.info(`  review items:          ${curated.statistics.reviewItemsTotal}`);
  console.info(`  included products:     ${curated.statistics.includedProductsTotal}`);
  console.info(`  excluded products:     ${curated.statistics.excludedProductsTotal}`);
  console.info(`  unresolved products:   ${curated.statistics.unresolvedProductsTotal}`);
  console.info(`  strict mode:           ${strict ? "yes" : "no"}`);
  console.info(`\nOutput: ${USDA_PATHS.curatedProductsFile}`);
}

async function main(): Promise<void> {
  const argument = process.argv[2];

  if (argument === "--help" || argument === "-h") {
    printUsage();
    return;
  }

  const command = resolveCommand(argument);

  const strict = process.argv.slice(3).includes("--strict");

  switch (command) {
    case "check":
      await runCheck();
      return;

    case "select":
      await runSelect();
      return;

    case "normalize":
      await runNormalize();
      return;

    case "review":
      await runReview();
      return;

    case "curate":
      await runCurate(strict);
      return;

    case "nutrients": {
      await runNutrientExtraction();
      break;
    }

    case "portions":
      await runPortionExtraction();
      return;

    case "normalize-portions":
      await runPortionNormalization();
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
