"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  listProducts,
  type ProductFoodState,
  type ProductSourceProvider,
  type ProductStatus,
  type ProductType,
  type ProductVerificationStatus,
} from "@/shared/api/products";
import { Button, Card, PageState, SelectField, TextInput } from "@/shared/ui";

import {
  PRODUCT_FOOD_STATE_LABELS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_TYPE_LABELS,
} from "./product-labels";

const PAGE_SIZE = 20;

export function ProductList() {
  const apiClient = getBrowserApiClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [type, setType] = useState<ProductType | "">(asProductType(searchParams.get("type")) ?? "");
  const [status, setStatus] = useState<ProductStatus | "">(
    asProductStatus(searchParams.get("status")) ?? "",
  );
  const [verificationStatus, setVerificationStatus] = useState<ProductVerificationStatus | "">(
    asVerificationStatus(searchParams.get("verificationStatus")) ?? "",
  );
  const [foodState, setFoodState] = useState<ProductFoodState | "">(
    asFoodState(searchParams.get("foodState")) ?? "",
  );
  const [sourceProvider, setSourceProvider] = useState<ProductSourceProvider | "UNASSIGNED" | "">(
    asSourceProvider(searchParams.get("sourceProvider")) ?? "",
  );
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const brandId = searchParams.get("brandId") ?? undefined;
  const createdFrom = searchParams.get("createdFrom") ?? undefined;
  const includeArchived = searchParams.get("includeArchived") !== "false";
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [
      "admin-products",
      {
        search,
        type,
        status,
        verificationStatus,
        foodState,
        sourceProvider,
        categoryId,
        brandId,
        createdFrom,
        includeArchived,
        page,
      },
    ],
    queryFn: () =>
      listProducts(apiClient, {
        ...(search.trim() === "" ? {} : { search: search.trim() }),
        ...(type === "" ? {} : { type }),
        ...(status === "" ? {} : { status }),
        ...(verificationStatus === "" ? {} : { verificationStatus }),
        ...(foodState === "" ? {} : { foodState }),
        ...(sourceProvider === "" ? {} : { sourceProvider }),
        ...(categoryId === undefined ? {} : { categoryId }),
        ...(brandId === undefined ? {} : { brandId }),
        ...(createdFrom === undefined ? {} : { createdFrom }),
        includeArchived,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const totalPages = Math.max(1, Math.ceil((query.data?.meta.total ?? 0) / PAGE_SIZE));

  return (
    <section className="admin-page product-page" aria-labelledby="products-title">
      <header className="product-page__header">
        <div>
          <p className="admin-page__eyebrow">Каталог</p>
          <h1 id="products-title">Продукти</h1>
          <p className="admin-page__description">
            Пошук, фільтри та lifecycle generic і branded продуктів.
          </p>
        </div>
        <Link className="ui-button ui-button--primary" href="/products/new">
          Створити продукт
        </Link>
      </header>

      <Card>
        <form
          className="product-filters"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            const next = new URLSearchParams();
            if (search.trim()) next.set("search", search.trim());
            if (type) next.set("type", type);
            if (status) next.set("status", status);
            if (verificationStatus) next.set("verificationStatus", verificationStatus);
            if (foodState) next.set("foodState", foodState);
            if (sourceProvider) next.set("sourceProvider", sourceProvider);
            if (categoryId) next.set("categoryId", categoryId);
            if (brandId) next.set("brandId", brandId);
            if (createdFrom) next.set("createdFrom", createdFrom);
            if (!includeArchived) next.set("includeArchived", "false");
            router.replace(`/products${next.size === 0 ? "" : `?${next.toString()}`}`);
          }}
        >
          <TextInput
            label="Пошук"
            value={search}
            placeholder="Назва, GTIN або бренд"
            onChange={(event) => setSearch(event.target.value)}
          />
          <SelectField
            label="Тип"
            value={type}
            options={[
              { value: "", label: "Усі типи" },
              ...Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            onChange={(event) => setType(event.target.value as ProductType | "")}
          />
          <SelectField
            label="Статус"
            value={status}
            options={[
              { value: "", label: "Усі статуси" },
              ...Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            onChange={(event) => setStatus(event.target.value as ProductStatus | "")}
          />
          <SelectField
            label="Верифікація"
            value={verificationStatus}
            options={[
              { value: "", label: "Усі статуси" },
              { value: "UNVERIFIED", label: "Не перевірено" },
              { value: "VERIFIED", label: "Перевірено" },
              { value: "REJECTED", label: "Відхилено" },
            ]}
            onChange={(event) =>
              setVerificationStatus(event.target.value as ProductVerificationStatus | "")
            }
          />
          <SelectField
            label="Стан продукту"
            value={foodState}
            options={[
              { value: "", label: "Усі стани" },
              ...Object.entries(PRODUCT_FOOD_STATE_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            onChange={(event) => setFoodState(event.target.value as ProductFoodState | "")}
          />
          <SelectField
            label="Джерело"
            value={sourceProvider}
            options={[
              { value: "", label: "Усі джерела" },
              { value: "USDA", label: "USDA" },
              { value: "MEALMIND_ADMIN", label: "MealMind admin" },
              { value: "MEALMIND_USER", label: "MealMind user" },
              { value: "UNASSIGNED", label: "Без primary source" },
            ]}
            onChange={(event) =>
              setSourceProvider(event.target.value as ProductSourceProvider | "UNASSIGNED" | "")
            }
          />
          <Button type="submit" variant="secondary">
            Застосувати
          </Button>
        </form>
        {categoryId || brandId || createdFrom ? (
          <p className="product-filters__context">
            Застосовано перехід з аналітики. <Link href="/products">Скинути додаткові фільтри</Link>
          </p>
        ) : null}
      </Card>

      {query.isPending ? <PageState title="Завантажуємо продукти" kind="loading" /> : null}
      {query.isError ? (
        <PageState
          title="Не вдалося завантажити продукти"
          description="Повторіть запит. Якщо помилка не зникає, перевірте API session."
          kind="error"
          actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
        />
      ) : null}
      {query.data?.data.items.length === 0 ? (
        <PageState
          title="Продуктів не знайдено"
          description="Змініть фільтри або створіть перший продукт."
          kind="empty"
        />
      ) : null}

      {query.data === undefined || query.data.data.items.length === 0 ? null : (
        <Card padding="none">
          <div className="product-table-scroll">
            <table className="product-table">
              <caption className="product-table__caption">
                Знайдено продуктів: {query.data.meta.total}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Продукт</th>
                  <th scope="col">Тип</th>
                  <th scope="col">Категорія</th>
                  <th scope="col">Бренд / GTIN</th>
                  <th scope="col">Статус</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.items.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-table__identity">
                        {product.primaryMedia?.thumbnailUrl === null ||
                        product.primaryMedia === null ? (
                          <span className="product-table__placeholder" aria-hidden="true">
                            P
                          </span>
                        ) : (
                          // Signed URLs point only to validated private product media.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.primaryMedia.thumbnailUrl}
                            alt=""
                            width="48"
                            height="48"
                          />
                        )}
                        <Link href={`/products/${product.id}`}>
                          {product.nameUa ?? product.nameEn}
                        </Link>
                      </div>
                    </td>
                    <td>{PRODUCT_TYPE_LABELS[product.type]}</td>
                    <td>{product.categoryName}</td>
                    <td>{product.brandName ?? product.gtin ?? "—"}</td>
                    <td>
                      <span
                        className={`product-status product-status--${product.status.toLowerCase()}`}
                      >
                        {PRODUCT_STATUS_LABELS[product.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <nav className="product-pagination" aria-label="Сторінки продуктів">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Назад
        </Button>
        <span aria-live="polite">
          Сторінка {page} з {totalPages}
        </span>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => setPage((value) => value + 1)}
        >
          Далі
        </Button>
      </nav>
    </section>
  );
}

function asProductType(value: string | null): ProductType | undefined {
  return value === "GENERIC" || value === "BRANDED" ? value : undefined;
}

function asProductStatus(value: string | null): ProductStatus | undefined {
  return value === "DRAFT" || value === "ACTIVE" || value === "ARCHIVED" ? value : undefined;
}

function asVerificationStatus(value: string | null): ProductVerificationStatus | undefined {
  return value === "UNVERIFIED" || value === "VERIFIED" || value === "REJECTED" ? value : undefined;
}

function asFoodState(value: string | null): ProductFoodState | undefined {
  return value === "UNSPECIFIED" ||
    value === "RAW" ||
    value === "COOKED" ||
    value === "PROCESSED" ||
    value === "READY_TO_EAT"
    ? value
    : undefined;
}

function asSourceProvider(value: string | null): ProductSourceProvider | "UNASSIGNED" | undefined {
  return value === "USDA" ||
    value === "MEALMIND_ADMIN" ||
    value === "MEALMIND_USER" ||
    value === "UNASSIGNED"
    ? value
    : undefined;
}
