import type { DatabaseClient } from "@mealmind/db";

import type {
  ReferenceListQuery,
  ReferenceRecord,
  ReferenceRepository,
  ReferenceResource,
  ReferenceWriteData,
} from "../domain/reference-repository.js";
import { createPrismaReference, updatePrismaReference } from "./prisma-reference-mutations.js";

export function createPrismaReferenceRepository(database: DatabaseClient): ReferenceRepository {
  return Object.freeze({
    async list(resource: ReferenceResource, query: ReferenceListQuery) {
      switch (resource) {
        case "allergens":
          return mapRecords(
            await database.allergen.findMany({
              where: { ...activeFilter(query), ...localizedSearch(query) },
              select: { id: true, code: true, nameUa: true, nameEn: true, isActive: true },
            }),
          );
        case "authors":
          return (
            await database.author.findMany({
              where: {
                ...(query.includeInactive ? {} : { archivedAt: null }),
                ...(query.search === undefined
                  ? {}
                  : {
                      OR: [
                        { displayName: { contains: query.search, mode: "insensitive" } },
                        { slug: { contains: query.search, mode: "insensitive" } },
                      ],
                    }),
              },
              select: {
                id: true,
                slug: true,
                displayName: true,
                type: true,
                expertiseArea: true,
                bio: true,
                archivedAt: true,
              },
            })
          ).map(({ archivedAt, ...author }) =>
            toRecord({ ...author, isActive: archivedAt === null }),
          );
        case "brands":
          return mapRecords(
            await database.brand.findMany({
              where: {
                ...(query.includeInactive ? {} : { status: "ACTIVE", archivedAt: null }),
                ...(query.search === undefined
                  ? {}
                  : {
                      OR: [
                        { name: { contains: query.search, mode: "insensitive" } },
                        { nameUa: { contains: query.search, mode: "insensitive" } },
                        { nameEn: { contains: query.search, mode: "insensitive" } },
                      ],
                    }),
              },
              select: brandSelect,
            }),
          );
        case "cuisines":
          return mapRecords(
            await database.cuisine.findMany({
              where: { ...activeFilter(query), ...localizedSearch(query) },
              select: {
                id: true,
                code: true,
                nameUa: true,
                nameEn: true,
                scope: true,
                isPreferenceSelectable: true,
                isActive: true,
                sortOrder: true,
              },
            }),
          );
        case "dietary-tags":
          return mapRecords(
            await database.dietaryTag.findMany({
              where: { ...activeFilter(query), ...localizedSearch(query) },
              select: {
                id: true,
                code: true,
                nameUa: true,
                nameEn: true,
                kind: true,
                isRestrictionSelectable: true,
                isActive: true,
                sortOrder: true,
              },
            }),
          );
        case "meal-types":
          return mapRecords(
            await database.mealType.findMany({
              where: { ...activeFilter(query), ...localizedSearch(query) },
              select: {
                id: true,
                code: true,
                nameUa: true,
                nameEn: true,
                kind: true,
                isActive: true,
                sortOrder: true,
              },
            }),
          );
        case "measurement-units": {
          const units = await database.measurementUnit.findMany({
            where: { ...activeFilter(query), ...localizedSearch(query) },
            select: {
              id: true,
              code: true,
              symbol: true,
              nameUa: true,
              nameEn: true,
              dimension: true,
              factorToBaseUnit: true,
              isBaseUnit: true,
              isActive: true,
              sortOrder: true,
            },
          });
          return units.map(({ factorToBaseUnit, ...unit }) =>
            toRecord({ ...unit, factorToBaseUnit: factorToBaseUnit.toString() }),
          );
        }
        case "nutrients":
          return mapRecords(
            await database.nutrient.findMany({
              where: { ...activeFilter(query), ...localizedSearch(query) },
              select: {
                id: true,
                code: true,
                nameUa: true,
                nameEn: true,
                group: true,
                unit: true,
                displayLevel: true,
                isTargetable: true,
                isActive: true,
                sortOrder: true,
                usdaNutrientId: true,
                usdaNutrientNumber: true,
              },
            }),
          );
        case "product-categories":
          return mapRecords(
            await database.productCategory.findMany({
              // The service filters categories so matching descendants keep their ancestors.
              where: activeFilter(query),
              select: {
                id: true,
                code: true,
                nameUa: true,
                nameEn: true,
                kind: true,
                parentCategoryId: true,
                isAssignable: true,
                isActive: true,
                sortOrder: true,
              },
            }),
          );
        case "recipe-types":
          return mapRecords(
            await database.recipeType.findMany({
              where: { ...activeFilter(query), ...localizedSearch(query) },
              select: {
                id: true,
                code: true,
                nameUa: true,
                nameEn: true,
                isActive: true,
                sortOrder: true,
              },
            }),
          );
        default:
          return assertNever(resource);
      }
    },
    create(resource: ReferenceResource, data: ReferenceWriteData, actorUserId: string) {
      return createPrismaReference(database, resource, data, actorUserId);
    },
    update(resource: ReferenceResource, id: string, data: ReferenceWriteData) {
      return updatePrismaReference(database, resource, id, data);
    },
  });
}

const brandSelect = {
  id: true,
  name: true,
  nameUa: true,
  nameEn: true,
  countryCode: true,
  websiteUrl: true,
  status: true,
  verificationStatus: true,
} as const;

function activeFilter(query: ReferenceListQuery): { readonly isActive?: true } {
  return query.includeInactive ? {} : { isActive: true };
}

function localizedSearch(query: ReferenceListQuery) {
  return query.search === undefined
    ? {}
    : {
        OR: [
          { code: { contains: query.search, mode: "insensitive" as const } },
          { nameUa: { contains: query.search, mode: "insensitive" as const } },
          { nameEn: { contains: query.search, mode: "insensitive" as const } },
        ],
      };
}

function mapRecords<TRecord extends { readonly id: string }>(records: readonly TRecord[]) {
  return records.map((record) =>
    toRecord(record as Record<string, unknown> & { readonly id: string }),
  );
}

function toRecord(record: Record<string, unknown> & { readonly id: string }): ReferenceRecord {
  return Object.freeze({ ...record });
}

function assertNever(value: never): never {
  throw new Error(`Unsupported reference resource: ${String(value)}`);
}
