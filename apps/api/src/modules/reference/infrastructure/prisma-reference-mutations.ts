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
      if (!splitAuthorData(data).hasLinkFields) {
        return database.author.create({
          data: authorCreateData(data, actorUserId),
        });
      }
      return database.$transaction(async (transaction) => {
        const { authorData, links } = splitAuthorData(data);
        const author = await transaction.author.create({
          data: authorCreateData(authorData, actorUserId),
        });
        if (links.length > 0) {
          await transaction.authorLink.createMany({
            data: links.map((link, index) => ({
              ...link,
              authorId: author.id,
              position: index + 1,
            })),
          });
        }
        return { ...author, ...authorLinkFields(links) };
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
      return database.$transaction(async (transaction) => {
        const { authorData, links, hasLinkFields } = splitAuthorData(data);
        const author = await transaction.author.update({
          where: { id },
          data: authorUpdateData(authorData),
        });
        if (hasLinkFields) {
          await transaction.authorLink.deleteMany({ where: { authorId: id } });
          if (links.length > 0) {
            await transaction.authorLink.createMany({
              data: links.map((link, index) => ({ ...link, authorId: id, position: index + 1 })),
            });
          }
        }
        const currentLinks = hasLinkFields
          ? links
          : await transaction.authorLink.findMany({
              where: { authorId: id },
              select: { type: true, url: true },
              orderBy: { position: "asc" },
            });
        return { ...author, ...authorLinkFields(currentLinks) };
      });
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
  const verification =
    fields.type === "EXPERT"
      ? (() => {
          const verifiedAt = new Date();
          return {
            createdAt: verifiedAt,
            expertiseVerifiedByUserId: actorUserId,
            expertiseVerifiedAt: verifiedAt,
          };
        })()
      : {};
  return {
    ...(fields as unknown as Omit<Prisma.AuthorUncheckedCreateInput, "createdByUserId">),
    createdByUserId: actorUserId,
    ...verification,
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

const AUTHOR_LINK_FIELDS = {
  instagramUrl: "INSTAGRAM",
  youtubeUrl: "YOUTUBE",
  tiktokUrl: "TIKTOK",
  websiteUrl: "WEBSITE",
  otherUrl: "OTHER",
} as const;

function splitAuthorData(data: ReferenceWriteData) {
  const authorData = { ...data };
  const links: Array<{
    type: (typeof AUTHOR_LINK_FIELDS)[keyof typeof AUTHOR_LINK_FIELDS];
    url: string;
  }> = [];
  let hasLinkFields = false;
  for (const [field, type] of Object.entries(AUTHOR_LINK_FIELDS) as Array<
    [keyof typeof AUTHOR_LINK_FIELDS, (typeof AUTHOR_LINK_FIELDS)[keyof typeof AUTHOR_LINK_FIELDS]]
  >) {
    if (field in authorData) hasLinkFields = true;
    const value = authorData[field];
    delete authorData[field];
    if (typeof value === "string" && value.length > 0) links.push({ type, url: value });
  }
  return { authorData, links, hasLinkFields };
}

function authorLinkFields(
  links: readonly {
    readonly type: (typeof AUTHOR_LINK_FIELDS)[keyof typeof AUTHOR_LINK_FIELDS];
    readonly url: string;
  }[],
) {
  return Object.fromEntries(
    Object.entries(AUTHOR_LINK_FIELDS).map(([field, type]) => [
      field,
      links.find((link) => link.type === type)?.url ?? null,
    ]),
  );
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
  authors: [
    "id",
    "type",
    "expertiseArea",
    "slug",
    "displayName",
    "bio",
    ...Object.keys(AUTHOR_LINK_FIELDS),
  ],
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
  if (resource === "authors" && isCheckConstraintError(error)) {
    return new ReferenceRelationError("Тип автора не відповідає заповненим полям");
  }
  return error;
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function isCheckConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2004") return true;

  const databaseError = error.meta?.database_error;
  return (
    typeof databaseError === "object" &&
    databaseError !== null &&
    "code" in databaseError &&
    databaseError.code === "23514"
  );
}

function assertNever(value: never): never {
  throw new Error(`Unsupported reference resource: ${String(value)}`);
}
