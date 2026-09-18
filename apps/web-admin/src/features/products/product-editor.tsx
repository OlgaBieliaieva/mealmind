"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  changeProductStatus,
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
  type ProductStatus,
} from "@/shared/api/products";
import {
  createReferenceData,
  listReferenceData,
  type ReferenceItem,
} from "@/shared/api/reference-data";
import { showErrorToast } from "@/shared/feedback/error-toast";
import { PageState } from "@/shared/ui";

import { ProductForm, type ProductOption } from "./product-form";
import {
  EMPTY_PRODUCT_FORM,
  mapProductFormToCreate,
  mapProductFormToUpdate,
  mapProductToForm,
} from "./product-form-schema";
import { ProductPhotoUploader } from "./product-photo-uploader";
import { ProductStatusActions } from "./product-status-actions";

export interface ProductEditorProps {
  readonly productId?: string;
}

export function ProductEditor({ productId }: ProductEditorProps) {
  const apiClient = getBrowserApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const isEdit = productId !== undefined;
  const productQuery = useQuery({
    queryKey: ["admin-product", productId],
    queryFn: () => getProduct(apiClient, productId as string),
    enabled: isEdit,
  });
  const categories = useReferenceOptions("product-categories");
  const units = useReferenceOptions("measurement-units");
  const brands = useReferenceOptions("brands", true);
  const nutrients = useReferenceOptions("nutrients");

  const initialValues = useMemo(
    () =>
      productQuery.data === undefined
        ? EMPTY_PRODUCT_FORM
        : mapProductToForm(productQuery.data.data),
    [productQuery.data],
  );
  const searchGenericProducts = useCallback(
    async (search: string) => {
      const response = await listProducts(apiClient, {
        type: "GENERIC",
        status: "ACTIVE",
        search,
        pageSize: 20,
      });
      return response.data.items.map((product) => ({
        value: product.id,
        label: product.nameUa ?? product.nameEn,
        description: product.categoryName,
      }));
    },
    [apiClient],
  );
  const loadBaseProduct = useCallback(
    async (id: string) => (await getProduct(apiClient, id)).data,
    [apiClient],
  );
  const createBrand = useCallback(
    async (data: Parameters<typeof createReferenceData>[2]) => {
      const response = await createReferenceData(apiClient, "brands", data);
      await queryClient.invalidateQueries({
        queryKey: ["admin-reference-options", "brands"],
      });
      toast.success("Бренд створено");
      return {
        value: response.data.id,
        label: String(response.data.name ?? response.data.nameUa ?? response.data.nameEn),
      };
    },
    [apiClient, queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: async (values: typeof initialValues) =>
      isEdit
        ? updateProduct(apiClient, productId, mapProductFormToUpdate(values))
        : createProduct(apiClient, mapProductFormToCreate(values)),
    onSuccess: async (response) => {
      toast.success(isEdit ? "Продукт оновлено" : "Продукт створено");
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      if (isEdit) {
        await queryClient.invalidateQueries({ queryKey: ["admin-product", productId] });
      } else {
        router.push(`/products/${response.data.id}`);
      }
    },
    onError: showErrorToast,
  });

  const statusMutation = useMutation({
    mutationFn: (status: ProductStatus) =>
      changeProductStatus(apiClient, productId as string, status),
    onSuccess: async () => {
      toast.success("Статус продукту змінено");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-product", productId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
      ]);
    },
    onError: showErrorToast,
  });

  const referencesPending =
    categories.isPending || units.isPending || brands.isPending || nutrients.isPending;
  const referencesError =
    categories.isError || units.isError || brands.isError || nutrients.isError;

  if ((isEdit && productQuery.isPending) || referencesPending) {
    return <PageState kind="loading" title="Завантажуємо редактор продукту" />;
  }
  if ((isEdit && productQuery.isError) || referencesError) {
    return (
      <PageState
        kind="error"
        title="Не вдалося відкрити редактор"
        description="Перевірте доступ до API та повторіть спробу."
        actions={
          <Link className="ui-button ui-button--secondary" href="/products">
            До продуктів
          </Link>
        }
      />
    );
  }

  const current = productQuery.data?.data;
  const initialGenericOptions =
    current?.baseProductId === null || current?.baseProductId === undefined
      ? []
      : [{ value: current.baseProductId, label: current.baseProductName ?? current.baseProductId }];

  return (
    <section className="admin-page product-page" aria-labelledby="product-editor-title">
      <header className="product-page__header">
        <div>
          <p className="admin-page__eyebrow">Каталог продуктів</p>
          <h1 id="product-editor-title">
            {isEdit ? (current?.nameUa ?? current?.nameEn) : "Новий продукт"}
          </h1>
          <p className="admin-page__description">
            {isEdit
              ? "Редагування даних, status, portions, nutrients і фото."
              : "Створіть generic product або branded snapshot від базового продукту."}
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/products">
          До списку
        </Link>
      </header>

      {current === undefined ? null : (
        <ProductStatusActions
          status={current.status}
          isPending={statusMutation.isPending}
          onChange={(status) => statusMutation.mutate(status)}
        />
      )}

      <ProductForm
        mode={isEdit ? "edit" : "create"}
        initialValues={initialValues}
        categories={categories.options}
        measurementUnits={units.options}
        brands={brands.options}
        genericProducts={initialGenericOptions}
        nutrients={nutrients.options}
        isSubmitting={saveMutation.isPending}
        onSearchGenericProducts={searchGenericProducts}
        onLoadBaseProduct={loadBaseProduct}
        onCreateBrand={createBrand}
        onSubmit={(values) => saveMutation.mutateAsync(values).then(() => undefined)}
      />

      {current === undefined ? null : (
        <ProductPhotoUploader
          productId={current.id}
          media={current.media}
          onChanged={() =>
            queryClient
              .invalidateQueries({ queryKey: ["admin-product", current.id] })
              .then(() => undefined)
          }
        />
      )}
    </section>
  );
}

function useReferenceOptions(
  resource: "product-categories" | "measurement-units" | "brands" | "nutrients",
  includeInactive = false,
) {
  const apiClient = getBrowserApiClient();
  const query = useQuery({
    queryKey: ["admin-reference-options", resource],
    queryFn: () => listReferenceData(apiClient, { resource, pageSize: 100, includeInactive }),
  });

  return {
    ...query,
    options: flattenReferenceItems(
      (query.data?.data.items ?? []).filter(
        (item) => resource !== "brands" || item.status !== "ARCHIVED",
      ),
      0,
      resource === "brands",
    ),
  };
}

function flattenReferenceItems(
  items: readonly ReferenceItem[],
  depth = 0,
  preferPrimaryName = false,
): ProductOption[] {
  return items.flatMap((item) => {
    const name = preferPrimaryName ? readPrimaryName(item) : readLabel(item);
    const option = {
      value: item.id,
      label: `${"— ".repeat(depth)}${name}`,
      ...(typeof item.unit === "string" ? { unit: nutrientUnitLabel(item.unit) } : {}),
    };
    const children = Array.isArray(item.children)
      ? flattenReferenceItems(
          item.children as readonly ReferenceItem[],
          depth + 1,
          preferPrimaryName,
        )
      : [];
    return [option, ...children];
  });
}

function readPrimaryName(item: ReferenceItem): string {
  const name = item.name;
  return typeof name === "string" && name.trim().length > 0 ? name : readLabel(item);
}

function nutrientUnitLabel(unit: string): string {
  const labels: Readonly<Record<string, string>> = {
    KCAL: "ккал",
    G: "г",
    MG: "мг",
    MCG: "мкг",
  };
  return labels[unit] ?? unit.toLowerCase();
}

function readLabel(item: ReferenceItem): string {
  for (const field of ["nameUa", "name", "nameEn", "code", "symbol"] as const) {
    const value = item[field];
    if (typeof value === "string") return value;
  }
  return item.id;
}
