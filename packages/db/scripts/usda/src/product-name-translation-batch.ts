import type {
  ProductNameTranslationInputDocument,
  ProductNameTranslationInputItem,
  ProductNameTranslationResultItem,
  ProductNameTranslationsDocument,
} from "./product-name-translation-types.js";

export interface BuildProductNameTranslationBatchInput {
  readonly source: ProductNameTranslationInputDocument;

  /**
   * Existing translations from previous batches.
   *
   * null means translation has not started yet.
   */
  readonly existingTranslations: ProductNameTranslationsDocument | null;

  readonly batchSize: number;
}

export interface ProductNameTranslationBatchDocument {
  readonly schemaVersion: 1;

  readonly sourceSchemaVersion: 1;

  readonly statistics: {
    readonly sourceItemsTotal: number;

    readonly alreadyTranslatedItems: number;

    readonly remainingItems: number;

    readonly batchItemsTotal: number;
  };

  readonly items: readonly ProductNameTranslationInputItem[];
}

function validateBatchSize(batchSize: number): void {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error(`Invalid product-name translation batch size: ${batchSize}.`);
  }
}

function buildTranslatedKeys(
  document: ProductNameTranslationsDocument | null,
): ReadonlySet<string> {
  if (!document) {
    return new Set<string>();
  }

  const keys = new Set<string>();

  for (const translation of document.translations) {
    if (keys.has(translation.key)) {
      throw new Error(`Duplicate product-name translation key "${translation.key}".`);
    }

    keys.add(translation.key);
  }

  return keys;
}

export function buildProductNameTranslationBatch(
  input: BuildProductNameTranslationBatchInput,
): ProductNameTranslationBatchDocument {
  validateBatchSize(input.batchSize);

  const translatedKeys = buildTranslatedKeys(input.existingTranslations);

  const remainingItems = input.source.items.filter((item) => !translatedKeys.has(item.key));

  const items = remainingItems.slice(0, input.batchSize);

  return {
    schemaVersion: 1,

    sourceSchemaVersion: input.source.schemaVersion,

    statistics: {
      sourceItemsTotal: input.source.items.length,

      alreadyTranslatedItems: translatedKeys.size,

      remainingItems: remainingItems.length,

      batchItemsTotal: items.length,
    },

    items,
  };
}

export interface MergeProductNameTranslationsInput {
  readonly source: ProductNameTranslationInputDocument;

  readonly existingTranslations: ProductNameTranslationsDocument | null;

  readonly newTranslations: readonly ProductNameTranslationResultItem[];
}

/**
 * Merges one completed translation batch into the accumulated
 * translation document.
 *
 * Invariants:
 *
 * - every translation key must exist in the source input;
 * - translation keys must be unique;
 * - existing translations are never silently overwritten;
 * - Ukrainian names must not be empty;
 * - output ordering is deterministic.
 */
export function mergeProductNameTranslations(
  input: MergeProductNameTranslationsInput,
): ProductNameTranslationsDocument {
  const sourceKeys = new Set(input.source.items.map((item) => item.key));

  const translationsByKey = new Map<string, ProductNameTranslationResultItem>();

  for (const translation of input.existingTranslations?.translations ?? []) {
    if (translationsByKey.has(translation.key)) {
      throw new Error(`Duplicate existing product-name translation key "${translation.key}".`);
    }

    translationsByKey.set(translation.key, translation);
  }

  for (const translation of input.newTranslations) {
    if (!sourceKeys.has(translation.key)) {
      throw new Error(`Unknown product-name translation key "${translation.key}".`);
    }

    if (translationsByKey.has(translation.key)) {
      throw new Error(
        `Product-name translation key "${translation.key}" has already been translated.`,
      );
    }

    const nameUa = translation.nameUa.trim();

    if (!nameUa) {
      throw new Error(`Empty Ukrainian translation for key "${translation.key}".`);
    }

    translationsByKey.set(translation.key, {
      key: translation.key,

      nameUa,
    });
  }

  const translations = [...translationsByKey.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );

  return {
    schemaVersion: 1,

    sourceSchemaVersion: input.source.schemaVersion,

    statistics: {
      translationItemsTotal: input.source.items.length,

      translatedItemsTotal: translations.length,
    },

    translations,
  };
}
