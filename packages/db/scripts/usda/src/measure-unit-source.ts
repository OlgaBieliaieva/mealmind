import type { UsdaMeasureUnit } from "./portion-types.js";

export function parseMeasureUnitRow(
  row: Readonly<Record<string, string | undefined>>,
): UsdaMeasureUnit {
  const id = row.id?.trim();

  const name = row.name?.trim();

  if (!id) {
    throw new Error("Missing measure unit ID.");
  }

  if (!name) {
    throw new Error(`Missing measure unit name for ID "${id}".`);
  }

  return {
    externalId: id,

    name,
  };
}
