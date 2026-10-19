import { Prisma, type DatabaseClient } from "@mealmind/db";

type ProductNutritionDatabase = DatabaseClient | Prisma.TransactionClient;

export interface EffectiveProductNutrient {
  readonly productId: string;
  readonly nutrientId: string;
  readonly valuePer100g: Prisma.Decimal;
  readonly valueType:
    | "ANALYTICAL"
    | "DERIVED"
    | "ESTIMATED"
    | "CALCULATED"
    | "LABEL"
    | "UNKNOWN";
  readonly origin: "PRODUCT" | "BASE_PRODUCT";
  readonly nutrient: {
    readonly id: string;
    readonly code: string;
    readonly nameUa: string;
    readonly group: string;
    readonly unit: string;
    readonly sortOrder: number;
  };
}

interface ProductBaseLink {
  readonly id: string;
  readonly baseProductId: string | null;
}

interface StoredProductNutrient {
  readonly productId: string;
  readonly nutrientId: string;
  readonly valuePer100g: Prisma.Decimal;
  readonly valueType: EffectiveProductNutrient["valueType"];
  readonly nutrient: EffectiveProductNutrient["nutrient"];
}

export async function findEffectiveProductNutrients(
  database: ProductNutritionDatabase,
  productIds: readonly string[],
  nutrientIds?: readonly string[],
): Promise<readonly EffectiveProductNutrient[]> {
  const uniqueProductIds = [...new Set(productIds)];
  if (uniqueProductIds.length === 0) return [];

  const products = await database.product.findMany({
    where: { id: { in: uniqueProductIds } },
    select: { id: true, baseProductId: true },
  });
  const sourceProductIds = [
    ...new Set(products.flatMap((product) => [product.id, ...(product.baseProductId ? [product.baseProductId] : [])])),
  ];
  const stored = await database.productNutrient.findMany({
    where: {
      productId: { in: sourceProductIds },
      ...(nutrientIds === undefined ? {} : { nutrientId: { in: [...new Set(nutrientIds)] } }),
    },
    select: {
      productId: true,
      nutrientId: true,
      valuePer100g: true,
      valueType: true,
      nutrient: {
        select: { id: true, code: true, nameUa: true, group: true, unit: true, sortOrder: true },
      },
    },
  });

  return mergeEffectiveProductNutrients(products, stored);
}

export function mergeEffectiveProductNutrients(
  products: readonly ProductBaseLink[],
  stored: readonly StoredProductNutrient[],
): readonly EffectiveProductNutrient[] {
  const storedByProduct = new Map<string, readonly StoredProductNutrient[]>();
  for (const productId of new Set(stored.map((item) => item.productId))) {
    storedByProduct.set(
      productId,
      stored.filter((item) => item.productId === productId),
    );
  }

  return products.flatMap((product) => {
    const own = storedByProduct.get(product.id) ?? [];
    const ownIds = new Set(own.map((item) => item.nutrientId));
    const inherited =
      product.baseProductId === null
        ? []
        : (storedByProduct.get(product.baseProductId) ?? []).filter(
            (item) => !ownIds.has(item.nutrientId),
          );

    return [
      ...own.map((item) => ({ ...item, productId: product.id, origin: "PRODUCT" as const })),
      ...inherited.map((item) => ({
        ...item,
        productId: product.id,
        valueType: "ESTIMATED" as const,
        origin: "BASE_PRODUCT" as const,
      })),
    ];
  });
}
