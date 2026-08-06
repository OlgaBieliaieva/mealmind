import { readCsvRows } from "./csv.js";
import type {
  FoodCsvRow,
  FoundationFoodCsvRow,
  SelectedFood,
  SelectedFoodsDocument,
  SelectFoodsInputPaths,
  SrLegacyFoodCsvRow,
  UsdaDataset,
} from "./types.js";

interface DatasetReference {
  readonly dataset: UsdaDataset;
  readonly ndbNumber: string | null;
}

interface DatasetReferenceCollection {
  readonly referencesByFdcId: ReadonlyMap<number, DatasetReference>;
  readonly foundationReferencesRead: number;
  readonly srLegacyReferencesRead: number;
}

function parseFdcId(rawValue: string, sourceName: string, rowNumber: number): number {
  const normalized = rawValue.trim();
  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(
      [`Invalid fdc_id in ${sourceName}.`, `Row: ${rowNumber}.`, `Value: "${rawValue}".`].join(" "),
    );
  }

  return parsed;
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function addDatasetReference(
  references: Map<number, DatasetReference>,
  fdcId: number,
  reference: DatasetReference,
  sourceName: string,
): void {
  const existing = references.get(fdcId);

  if (!existing) {
    references.set(fdcId, reference);
    return;
  }

  if (existing.dataset !== reference.dataset) {
    throw new Error(
      [
        `FDC ID ${fdcId} belongs to multiple USDA datasets.`,
        `Existing dataset: ${existing.dataset}.`,
        `Conflicting dataset from ${sourceName}: ${reference.dataset}.`,
      ].join(" "),
    );
  }

  throw new Error(`Duplicate FDC ID ${fdcId} in USDA dataset source ${sourceName}.`);
}

async function collectDatasetReferences(
  paths: Pick<SelectFoodsInputPaths, "foundationFoodFile" | "srLegacyFoodFile">,
): Promise<DatasetReferenceCollection> {
  const referencesByFdcId = new Map<number, DatasetReference>();

  let foundationReferencesRead = 0;
  let srLegacyReferencesRead = 0;

  for await (const row of readCsvRows<FoundationFoodCsvRow>(paths.foundationFoodFile)) {
    foundationReferencesRead += 1;

    const fdcId = parseFdcId(row.fdc_id, "foundation_food.csv", foundationReferencesRead + 1);

    addDatasetReference(
      referencesByFdcId,
      fdcId,
      {
        dataset: "FOUNDATION_FOOD",
        ndbNumber: normalizeOptionalText(row.NDB_number),
      },
      "foundation_food.csv",
    );
  }

  for await (const row of readCsvRows<SrLegacyFoodCsvRow>(paths.srLegacyFoodFile)) {
    srLegacyReferencesRead += 1;

    const fdcId = parseFdcId(row.fdc_id, "sr_legacy_food.csv", srLegacyReferencesRead + 1);

    addDatasetReference(
      referencesByFdcId,
      fdcId,
      {
        dataset: "SR_LEGACY",
        ndbNumber: normalizeOptionalText(row.NDB_number),
      },
      "sr_legacy_food.csv",
    );
  }

  return {
    referencesByFdcId,
    foundationReferencesRead,
    srLegacyReferencesRead,
  };
}

function compareSelectedFoods(left: SelectedFood, right: SelectedFood): number {
  const datasetComparison = left.dataset.localeCompare(right.dataset, "en");

  if (datasetComparison !== 0) {
    return datasetComparison;
  }

  const descriptionComparison = left.description.localeCompare(right.description, "en", {
    sensitivity: "base",
  });

  if (descriptionComparison !== 0) {
    return descriptionComparison;
  }

  return left.fdcId - right.fdcId;
}

export async function selectFoods(paths: SelectFoodsInputPaths): Promise<SelectedFoodsDocument> {
  const { referencesByFdcId, foundationReferencesRead, srLegacyReferencesRead } =
    await collectDatasetReferences(paths);

  const unmatchedReferenceIds = new Set(referencesByFdcId.keys());
  const selectedFoods: SelectedFood[] = [];
  const selectedFoodIds = new Set<number>();

  let foodRowsRead = 0;
  let selectedFoundationFoods = 0;
  let selectedSrLegacyFoods = 0;

  for await (const row of readCsvRows<FoodCsvRow>(paths.foodFile)) {
    foodRowsRead += 1;

    const fdcId = parseFdcId(row.fdc_id, "food.csv", foodRowsRead + 1);

    const reference = referencesByFdcId.get(fdcId);

    if (!reference) {
      continue;
    }

    if (selectedFoodIds.has(fdcId)) {
      throw new Error(`Duplicate selected FDC ID ${fdcId} in food.csv.`);
    }

    const description = row.description.trim();

    if (!description) {
      throw new Error(`Selected FDC ID ${fdcId} has an empty description in food.csv.`);
    }

    selectedFoodIds.add(fdcId);
    unmatchedReferenceIds.delete(fdcId);

    if (reference.dataset === "FOUNDATION_FOOD") {
      selectedFoundationFoods += 1;
    } else {
      selectedSrLegacyFoods += 1;
    }

    selectedFoods.push({
      fdcId,
      dataset: reference.dataset,
      dataType: row.data_type.trim(),
      description,
      foodCategoryExternalId: normalizeOptionalText(row.food_category_id),
      publicationDate: normalizeOptionalText(row.publication_date),
      ndbNumber: reference.ndbNumber,
    });
  }

  if (unmatchedReferenceIds.size > 0) {
    const examples = [...unmatchedReferenceIds].sort((left, right) => left - right).slice(0, 10);

    throw new Error(
      [
        `${unmatchedReferenceIds.size} supported USDA references were not found in food.csv.`,
        `Example FDC IDs: ${examples.join(", ")}.`,
      ].join(" "),
    );
  }

  selectedFoods.sort(compareSelectedFoods);

  return {
    schemaVersion: 1,
    datasets: ["FOUNDATION_FOOD", "SR_LEGACY"],
    statistics: {
      foodRowsRead,
      foundationReferencesRead,
      srLegacyReferencesRead,
      selectedFoundationFoods,
      selectedSrLegacyFoods,
      selectedFoodsTotal: selectedFoods.length,
    },
    foods: selectedFoods,
  };
}
