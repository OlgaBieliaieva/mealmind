import type { ReferencePage } from "../application/reference-service.js";
import type { ReferenceRecord } from "../domain/reference-repository.js";

export function presentReferencePage(page: ReferencePage) {
  return {
    data: {
      items: page.items.map(sanitizeRecord),
    },
    meta: {
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
    },
  };
}

export function presentReference(record: ReferenceRecord) {
  return {
    data: sanitizeRecord(record),
  };
}

const PERSISTENCE_ONLY_FIELDS = new Set([
  "archivedAt",
  "avatarObjectPath",
  "createdAt",
  "createdByUserId",
  "expertiseVerifiedAt",
  "expertiseVerifiedByUserId",
  "notes",
  "updatedAt",
  "userId",
]);

function sanitizeRecord(record: ReferenceRecord): Readonly<Record<string, unknown>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(record).flatMap(([field, value]) => {
        if (PERSISTENCE_ONLY_FIELDS.has(field)) {
          return [];
        }

        if (field === "children" && Array.isArray(value)) {
          return [[field, value.map((child) => sanitizeRecord(child as ReferenceRecord))]];
        }

        return [[field, value]];
      }),
    ),
  );
}
