export const REFERENCE_RESOURCES = [
  "allergens",
  "authors",
  "brands",
  "cuisines",
  "dietary-tags",
  "meal-types",
  "measurement-units",
  "nutrients",
  "product-categories",
  "recipe-types",
] as const;

export type ReferenceResource = (typeof REFERENCE_RESOURCES)[number];

export interface ReferenceListQuery {
  readonly search?: string | undefined;
  readonly includeInactive: boolean;
}

export interface ReferenceRecord {
  readonly id: string;
  readonly [field: string]: unknown;
}

export type ReferenceWriteData = Readonly<Record<string, unknown>>;

export interface ReferenceRepository {
  list(resource: ReferenceResource, query: ReferenceListQuery): Promise<readonly ReferenceRecord[]>;
  create(
    resource: ReferenceResource,
    data: ReferenceWriteData,
    actorUserId: string,
  ): Promise<ReferenceRecord>;
  update(
    resource: ReferenceResource,
    id: string,
    data: ReferenceWriteData,
  ): Promise<ReferenceRecord | null>;
}
