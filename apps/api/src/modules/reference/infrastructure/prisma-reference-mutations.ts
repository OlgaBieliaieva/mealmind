import { Prisma, type DatabaseClient } from "@mealmind/db";

import { ReferenceConflictError, ReferenceRelationError } from "../application/reference-errors.js";
import type {
  ReferenceRecord,
  ReferenceResource,
  ReferenceWriteData,
} from "../domain/reference-repository.js";

export async function createPrismaReference(
  database: DatabaseClient,
  resource: ReferenceResource,
  data: ReferenceWriteData,
  actorUserId: string,
): Promise<ReferenceRecord> {
  try {
    const record = await createRecord(database, resource, data, actorUserId);
    return presentMutationRecord(resource, record);
  } catch (error) {
    throw mapMutationError(error, resource);
  }
}

export async function updatePrismaReference(
  database: DatabaseClient,
  resource: ReferenceResource,
  id: string,
  data: ReferenceWriteData,
): Promise<ReferenceRecord | null> {
  try {
    const record = await updateRecord(database, resource, id, data);
    return presentMutationRecord(resource, record);
  } catch (error) {
    if (isKnownPrismaError(error, "P2025")) return null;
    throw mapMutationError(error, resource);
  }
}

async function createRecord(
  database: DatabaseClient,
  resource: ReferenceResource,
  data: ReferenceWriteData,
  actorUserId: string,
): Promise<object> {
  switch (resource) {
    case "allergens":
      return database.allergen.create({
        data: data as unknown as Prisma.AllergenUncheckedCreateInput,
      });
    case "authors":
      return database.author.create({
        data: authorCreateData(data, actorUserId),
      });
    case "brands":
      return database.brand.create({ data: brandCreateData(data) });
    case "cuisines":
      return database.cuisine.create({
        data: data as unknown as Prisma.CuisineUncheckedCreateInput,
      });
    case "dietary-tags":
      return database.dietaryTag.create({
        data: data as unknown as Prisma.DietaryTagUncheckedCreateInput,
      });
    case "meal-types":
      return database.mealType.create({
        data: data as unknown as Prisma.MealTypeUncheckedCreateInput,
      });
    case "measurement-units":
      return database.measurementUnit.create({
        data: data as unknown as Prisma.MeasurementUnitUncheckedCreateInput,
      });
    case "nutrients":
      return database.nutrient.create({
        data: data as unknown as Prisma.NutrientUncheckedCreateInput,
      });
    case "product-categories":
      return database.productCategory.create({
        data: data as unknown as Prisma.ProductCategoryUncheckedCreateInput,
      });
    case "recipe-types":
      return database.recipeType.create({
        data: data as unknown as Prisma.RecipeTypeUncheckedCreateInput,
      });
    default:
      return assertNever(resource);
  }
}

async function updateRecord(
  database: DatabaseClient,
  resource: ReferenceResource,
  id: string,
  data: ReferenceWriteData,
): Promise<object> {
  switch (resource) {
    case "allergens":
      return database.allergen.update({
        where: { id },
        data: data as unknown as Prisma.AllergenUncheckedUpdateInput,
      });
    case "authors":
      return database.author.update({ where: { id }, data: authorUpdateData(data) });
    case "brands":
      return database.brand.update({ where: { id }, data: brandUpdateData(data) });
    case "cuisines":
      return database.cuisine.update({
        where: { id },
        data: data as unknown as Prisma.CuisineUncheckedUpdateInput,
      });
    case "dietary-tags":
      return database.dietaryTag.update({
        where: { id },
        data: data as unknown as Prisma.DietaryTagUncheckedUpdateInput,
      });
    case "meal-types":
      return database.mealType.update({
        where: { id },
        data: data as unknown as Prisma.MealTypeUncheckedUpdateInput,
      });
    case "measurement-units":
      return database.measurementUnit.update({
        where: { id },
        data: data as unknown as Prisma.MeasurementUnitUncheckedUpdateInput,
      });
    case "nutrients":
      return database.nutrient.update({
        where: { id },
        data: data as unknown as Prisma.NutrientUncheckedUpdateInput,
      });
    case "product-categories":
      return database.productCategory.update({
        where: { id },
        data: data as unknown as Prisma.ProductCategoryUncheckedUpdateInput,
      });
    case "recipe-types":
      return database.recipeType.update({
        where: { id },
        data: data as unknown as Prisma.RecipeTypeUncheckedUpdateInput,
      });
    default:
      return assertNever(resource);
  }
}

function authorCreateData(
  data: ReferenceWriteData,
  actorUserId: string,
): Prisma.AuthorUncheckedCreateInput {
  const { isActive, ...fields } = data;
  return {
    ...(fields as unknown as Omit<Prisma.AuthorUncheckedCreateInput, "createdByUserId">),
    createdByUserId: actorUserId,
    archivedAt: isActive === false ? new Date() : null,
  };
}

function authorUpdateData(data: ReferenceWriteData): Prisma.AuthorUncheckedUpdateInput {
  const { isActive, ...fields } = data;
  return {
    ...(fields as Prisma.AuthorUncheckedUpdateInput),
    ...(isActive === undefined ? {} : { archivedAt: isActive === false ? new Date() : null }),
  };
}

function brandCreateData(data: ReferenceWriteData): Prisma.BrandUncheckedCreateInput {
  const status = data.status as "DRAFT" | "ACTIVE" | "ARCHIVED";
  return {
    ...(data as unknown as Prisma.BrandUncheckedCreateInput),
    archivedAt: status === "ARCHIVED" ? new Date() : null,
  };
}

function brandUpdateData(data: ReferenceWriteData): Prisma.BrandUncheckedUpdateInput {
  const status = data.status;
  return {
    ...(data as Prisma.BrandUncheckedUpdateInput),
    ...(status === undefined ? {} : { archivedAt: status === "ARCHIVED" ? new Date() : null }),
  };
}

const FIELDS: Readonly<Record<ReferenceResource, readonly string[]>> = {
  allergens: ["id", "code", "nameUa", "nameEn", "isActive"],
  authors: ["id", "type", "expertiseArea", "slug", "displayName", "bio"],
  brands: [
    "id",
    "name",
    "nameUa",
    "nameEn",
    "countryCode",
    "websiteUrl",
    "status",
    "verificationStatus",
  ],
  cuisines: [
    "id",
    "code",
    "nameUa",
    "nameEn",
    "scope",
    "isPreferenceSelectable",
    "isActive",
    "sortOrder",
  ],
  "dietary-tags": [
    "id",
    "code",
    "nameUa",
    "nameEn",
    "kind",
    "isRestrictionSelectable",
    "isActive",
    "sortOrder",
  ],
  "meal-types": ["id", "code", "nameUa", "nameEn", "kind", "isActive", "sortOrder"],
  "measurement-units": [
    "id",
    "code",
    "symbol",
    "nameUa",
    "nameEn",
    "dimension",
    "factorToBaseUnit",
    "isBaseUnit",
    "isActive",
    "sortOrder",
  ],
  nutrients: [
    "id",
    "code",
    "nameUa",
    "nameEn",
    "group",
    "unit",
    "displayLevel",
    "isTargetable",
    "sortOrder",
    "usdaNutrientId",
    "usdaNutrientNumber",
    "isActive",
  ],
  "product-categories": [
    "id",
    "code",
    "nameUa",
    "nameEn",
    "kind",
    "parentCategoryId",
    "isAssignable",
    "isActive",
    "sortOrder",
  ],
  "recipe-types": ["id", "code", "nameUa", "nameEn", "isActive", "sortOrder"],
};

function presentMutationRecord(resource: ReferenceResource, value: object): ReferenceRecord {
  const source = value as Record<string, unknown>;
  const entries = FIELDS[resource].map((field) => [field, normalizeValue(source[field])]);

  if (resource === "authors") entries.push(["isActive", source.archivedAt === null]);

  return Object.freeze(Object.fromEntries(entries) as ReferenceRecord);
}

function normalizeValue(value: unknown): unknown {
  if (Prisma.Decimal.isDecimal(value)) return value.toString();
  return value;
}

function mapMutationError(error: unknown, resource: ReferenceResource): unknown {
  if (isKnownPrismaError(error, "P2002")) return new ReferenceConflictError(resource);
  if (isKnownPrismaError(error, "P2003")) {
    return new ReferenceRelationError("Пов’язаний запис довідника не існує");
  }
  return error;
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported reference resource: ${String(value)}`);
}
