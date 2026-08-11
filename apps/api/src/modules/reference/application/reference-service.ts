import type {
  ReferenceListQuery,
  ReferenceRecord,
  ReferenceRepository,
  ReferenceResource,
  ReferenceWriteData,
} from "../domain/reference-repository.js";
import { buildCategoryTree, type CategoryTreeNode } from "./category-tree.js";
import { ReferenceNotFoundError, ReferenceRelationError } from "./reference-errors.js";

export interface ReferencePage {
  readonly items: readonly (ReferenceRecord | CategoryTreeNode)[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface ListReferenceOptions extends ReferenceListQuery {
  readonly page: number;
  readonly pageSize: number;
}

export interface ReferenceService {
  list(resource: ReferenceResource, options: ListReferenceOptions): Promise<ReferencePage>;
  create(
    resource: ReferenceResource,
    data: ReferenceWriteData,
    actorUserId: string,
  ): Promise<ReferenceRecord>;
  update(
    resource: ReferenceResource,
    id: string,
    data: ReferenceWriteData,
  ): Promise<ReferenceRecord>;
  archive(resource: ReferenceResource, id: string): Promise<ReferenceRecord>;
}

export function createReferenceService(repository: ReferenceRepository): ReferenceService {
  return Object.freeze({
    async list(resource: ReferenceResource, options: ListReferenceOptions) {
      const records = await repository.list(resource, options);
      const ordered = stableSort(records);

      if (resource === "product-categories") {
        const selected = filterCategoryClosure(ordered, options.search);
        const tree = buildCategoryTree(selected);

        return Object.freeze({
          items: tree,
          page: 1,
          pageSize: tree.length,
          total: selected.length,
        });
      }

      const start = (options.page - 1) * options.pageSize;

      return Object.freeze({
        items: Object.freeze(ordered.slice(start, start + options.pageSize)),
        page: options.page,
        pageSize: options.pageSize,
        total: ordered.length,
      });
    },

    async create(resource: ReferenceResource, data: ReferenceWriteData, actorUserId: string) {
      if (resource === "product-categories") {
        const records = await repository.list(resource, { includeInactive: true });
        validateNewCategoryParent(records, data.parentCategoryId);
        validateCategoryActivity([
          ...records,
          {
            id: "new-category",
            parentCategoryId: data.parentCategoryId ?? null,
            isActive: data.isActive !== false,
          },
        ]);
      }

      return repository.create(resource, data, actorUserId);
    },

    async update(resource: ReferenceResource, id: string, data: ReferenceWriteData) {
      if (resource === "product-categories") {
        const records = await repository.list(resource, { includeInactive: true });
        validateCategoryUpdate(records, id, data);
      }

      const record = await repository.update(resource, id, data);

      if (record === null) {
        throw new ReferenceNotFoundError(resource);
      }

      return record;
    },

    async archive(resource: ReferenceResource, id: string) {
      const data = archiveData(resource);

      if (resource === "product-categories") {
        const records = await repository.list(resource, { includeInactive: true });
        validateCategoryUpdate(records, id, data);
      }

      const record = await repository.update(resource, id, data);
      if (record === null) throw new ReferenceNotFoundError(resource);
      return record;
    },
  });
}

function archiveData(resource: ReferenceResource): ReferenceWriteData {
  return resource === "brands" ? { status: "ARCHIVED" } : { isActive: false };
}

function validateNewCategoryParent(
  records: readonly ReferenceRecord[],
  parentCategoryId: unknown,
): void {
  if (parentCategoryId === null || parentCategoryId === undefined) return;

  if (
    typeof parentCategoryId !== "string" ||
    !records.some((record) => record.id === parentCategoryId)
  ) {
    throw new ReferenceRelationError("Батьківська категорія не існує");
  }
}

function validateCategoryUpdate(
  records: readonly ReferenceRecord[],
  id: string,
  data: ReferenceWriteData,
): void {
  const existing = records.find((record) => record.id === id);

  if (existing === undefined) {
    throw new ReferenceNotFoundError("product-categories");
  }

  const parentCategoryId = Object.hasOwn(data, "parentCategoryId")
    ? data.parentCategoryId
    : existing.parentCategoryId;
  validateNewCategoryParent(records, parentCategoryId);

  const candidate = records.map((record) =>
    record.id === id ? { ...record, ...data, parentCategoryId } : record,
  );
  validateCategoryActivity(candidate);
  try {
    buildCategoryTree(candidate);
  } catch {
    throw new ReferenceRelationError("Категорія не може бути власним нащадком");
  }
}

function validateCategoryActivity(records: readonly ReferenceRecord[]): void {
  const recordsById = new Map(records.map((record) => [record.id, record]));

  for (const record of records) {
    if (record.isActive === false || typeof record.parentCategoryId !== "string") continue;

    const parent = recordsById.get(record.parentCategoryId);
    if (parent?.isActive === false) {
      throw new ReferenceRelationError("Активна категорія не може належати неактивній категорії");
    }
  }
}

function filterCategoryClosure(
  records: readonly ReferenceRecord[],
  search: string | undefined,
): readonly ReferenceRecord[] {
  if (search === undefined) {
    return records;
  }

  const normalizedSearch = search.toLocaleLowerCase("uk");
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const selectedIds = new Set<string>();

  for (const record of records) {
    const searchableValues = [record.code, record.nameUa, record.nameEn];
    const matches = searchableValues.some(
      (value) =>
        typeof value === "string" && value.toLocaleLowerCase("uk").includes(normalizedSearch),
    );

    if (!matches) continue;

    let current: ReferenceRecord | undefined = record;
    while (current !== undefined && !selectedIds.has(current.id)) {
      selectedIds.add(current.id);
      const parentId: unknown = current.parentCategoryId;
      current = typeof parentId === "string" ? recordsById.get(parentId) : undefined;
    }
  }

  return records.filter((record) => selectedIds.has(record.id));
}

function stableSort(records: readonly ReferenceRecord[]): ReferenceRecord[] {
  return [...records].sort((left, right) => {
    const sortOrderDifference = readSortOrder(left) - readSortOrder(right);

    if (sortOrderDifference !== 0) {
      return sortOrderDifference;
    }

    const leftLabel = readLabel(left);
    const rightLabel = readLabel(right);
    const labelDifference = leftLabel.localeCompare(rightLabel, "uk", { sensitivity: "base" });

    return labelDifference === 0 ? left.id.localeCompare(right.id) : labelDifference;
  });
}

function readSortOrder(record: ReferenceRecord): number {
  return typeof record.sortOrder === "number" ? record.sortOrder : Number.MAX_SAFE_INTEGER;
}

function readLabel(record: ReferenceRecord): string {
  for (const field of ["nameUa", "displayName", "name", "nameEn", "code"] as const) {
    const value = record[field];

    if (typeof value === "string") {
      return value;
    }
  }

  return record.id;
}
