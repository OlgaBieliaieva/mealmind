"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import { listProducts, type ProductStatus, type ProductType } from "@/shared/api/products";
import { Button, Card, PageState, SelectField, TextInput } from "@/shared/ui";

import { PRODUCT_STATUS_LABELS, PRODUCT_TYPE_LABELS } from "./product-labels";

const PAGE_SIZE = 20;

export function ProductList() {
  const apiClient = getBrowserApiClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ProductType | "">("");
  const [status, setStatus] = useState<ProductStatus | "">("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin-products", { search, type, status, page }],
    queryFn: () =>
      listProducts(apiClient, {
        ...(search.trim() === "" ? {} : { search: search.trim() }),
        ...(type === "" ? {} : { type }),
        ...(status === "" ? {} : { status }),
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
          <Button type="submit" variant="secondary">
            Застосувати
          </Button>
        </form>
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
