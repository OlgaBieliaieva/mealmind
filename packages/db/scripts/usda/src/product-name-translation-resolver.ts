import type { ProductNameTranslationsDocument } from "./product-name-translation-types.js";

export function buildProductNameTranslationMap(
  document: ProductNameTranslationsDocument,
): ReadonlyMap<string, string> {
  if (document.schemaVersion !== 1) {
    throw new Error(
      `Unsupported product-name translations schema version: ${String(document.schemaVersion)}.`,
    );
  }

  const translations = new Map<string, string>();

  for (const translation of document.translations) {
    const key = translation.key.trim();

    const nameUa = translation.nameUa.trim();

    if (!key) {
      throw new Error("Product-name translation contains an empty key.");
    }

    if (!nameUa) {
      throw new Error(`Product-name translation "${key}" has an empty Ukrainian name.`);
    }

    if (translations.has(key)) {
      throw new Error(`Duplicate product-name translation key "${key}".`);
    }

    translations.set(key, nameUa);
  }

  return translations;
}
