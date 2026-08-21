import { PRODUCT_MODIFIER_TRANSLATIONS } from "../config/modifier-translations.js";

import type { ProductModifierTranslationKey } from "../config/modifier-translations.js";

export function translateModifier(modifierEn: string): string | null {
  const normalized = modifierEn.trim().toLowerCase().replace(/\s+/g, " ");

  if (normalized in PRODUCT_MODIFIER_TRANSLATIONS) {
    return PRODUCT_MODIFIER_TRANSLATIONS[normalized as ProductModifierTranslationKey];
  }

  return null;
}
