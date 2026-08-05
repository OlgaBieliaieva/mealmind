import type { ReferenceRecord } from "../domain/reference-repository.js";
import { ReferenceHierarchyError } from "./reference-errors.js";

export interface CategoryTreeNode extends ReferenceRecord {
  readonly children: readonly CategoryTreeNode[];
}

export function buildCategoryTree(
  records: readonly ReferenceRecord[],
): readonly CategoryTreeNode[] {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const childrenByParentId = new Map<string | null, ReferenceRecord[]>();

  for (const record of records) {
    const parentId = readParentId(record);

    if (parentId !== null && !recordsById.has(parentId)) {
      throw new ReferenceHierarchyError(`Product category ${record.id} has a missing parent`);
    }

    const siblings = childrenByParentId.get(parentId) ?? [];
    siblings.push(record);
    childrenByParentId.set(parentId, siblings);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(record: ReferenceRecord): CategoryTreeNode {
    if (visiting.has(record.id)) {
      throw new ReferenceHierarchyError("Product category hierarchy contains a cycle");
    }

    visiting.add(record.id);
    const children = (childrenByParentId.get(record.id) ?? []).map(visit);
    visiting.delete(record.id);
    visited.add(record.id);

    return Object.freeze({
      ...record,
      children: Object.freeze(children),
    });
  }

  const roots = (childrenByParentId.get(null) ?? []).map(visit);

  if (visited.size !== records.length) {
    throw new ReferenceHierarchyError("Product category hierarchy contains a cycle");
  }

  return Object.freeze(roots);
}

function readParentId(record: ReferenceRecord): string | null {
  const parentId = record.parentCategoryId;

  if (parentId === null || typeof parentId === "string") {
    return parentId;
  }

  throw new ReferenceHierarchyError(`Product category ${record.id} has an invalid parent`);
}
