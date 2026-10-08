"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  listProductImportCandidates,
  type ProductImportCandidateDisposition,
  type ProductImportCandidateStatus,
} from "@/shared/api/product-import-review";
import { Button, Card, PageState, SelectField, TextInput } from "@/shared/ui";

import {
  IMPORT_DISPOSITION_LABELS,
  IMPORT_STATUS_LABELS,
  reasonCodeLabel,
} from "./product-import-labels";

const PAGE_SIZE = 25;

export function ProductImportCandidateList() {
  const apiClient = getBrowserApiClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState<ProductImportCandidateStatus | "">(
    asStatus(searchParams.get("status")) ?? "PENDING",
  );
  const [disposition, setDisposition] = useState<ProductImportCandidateDisposition | "">(
    asDisposition(searchParams.get("disposition")) ?? "",
  );
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin-product-import-candidates", { search, status, disposition, page }],
    queryFn: () =>
      listProductImportCandidates(apiClient, {
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
        ...(disposition ? { disposition } : {}),
        page,
        pageSize: PAGE_SIZE,
      }),
  });
  const totalPages = Math.max(1, Math.ceil((query.data?.meta.total ?? 0) / PAGE_SIZE));

  return (
    <section className="admin-page import-review-page" aria-labelledby="import-review-title">
      <header className="import-review-page__header">
        <div>
          <p className="admin-page__eyebrow">Zakaz catalog</p>
          <h1 id="import-review-title">Перевірка імпорту</h1>
          <p className="admin-page__description">
            Перевіряйте source-backed дані перед створенням продуктів MealMind. Схвалення ще не
            публікує товар у каталозі.
          </p>
        </div>
        <Link className="ui-button ui-button--secondary" href="/products">
          До продуктів
        </Link>
      </header>

      <Card>
        <form
          className="import-review-filters"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            const next = new URLSearchParams();
            if (search.trim()) next.set("search", search.trim());
            if (status) next.set("status", status);
            if (disposition) next.set("disposition", disposition);
            router.replace(
              `/product-import${next.size === 0 ? "" : `?${next.toString()}`}`,
            );
          }}
        >
          <TextInput
            label="Пошук"
            value={search}
            placeholder="Назва, бренд, SKU або GTIN"
            onChange={(event) => setSearch(event.target.value)}
          />
          <SelectField
            label="Статус перевірки"
            value={status}
            options={[
              { value: "", label: "Усі статуси" },
              ...Object.entries(IMPORT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            onChange={(event) => setStatus(event.target.value as ProductImportCandidateStatus | "")}
          />
          <SelectField
            label="Результат pipeline"
            value={disposition}
            options={[
              { value: "", label: "Усі результати" },
              ...Object.entries(IMPORT_DISPOSITION_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            onChange={(event) =>
              setDisposition(event.target.value as ProductImportCandidateDisposition | "")
            }
          />
          <Button type="submit" variant="secondary">
            Застосувати
          </Button>
        </form>
      </Card>

      {query.isPending ? <PageState kind="loading" title="Завантажуємо кандидатів" /> : null}
      {query.isError ? (
        <PageState
          kind="error"
          title="Не вдалося завантажити чергу"
          description="Повторіть запит. Якщо помилка не зникає, перевірте API session і міграції."
          actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
        />
      ) : null}
      {query.data?.data.items.length === 0 ? (
        <PageState
          kind="empty"
          title="Кандидатів не знайдено"
          description="Змініть фільтри або імпортуйте новий candidate artifact."
        />
      ) : null}

      {query.data === undefined || query.data.data.items.length === 0 ? null : (
        <Card padding="none">
          <div className="import-review-table-scroll">
            <table className="import-review-table">
              <caption>Знайдено кандидатів: {query.data.meta.total}</caption>
              <thead>
                <tr>
                  <th scope="col">Кандидат</th>
                  <th scope="col">Ідентифікатори</th>
                  <th scope="col">Pipeline</th>
                  <th scope="col">Перевірка</th>
                  <th scope="col">Оновлено</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data.items.map((candidate) => (
                  <tr key={candidate.id}>
                    <td>
                      <div className="import-review-candidate">
                        {candidate.sourceImageUrl ? (
                          // Zakaz source image is shown only to an authenticated administrator.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={candidate.sourceImageUrl} alt="" width="56" height="56" />
                        ) : (
                          <span className="import-review-candidate__placeholder" aria-hidden="true">
                            Z
                          </span>
                        )}
                        <div>
                          <Link href={`/product-import/${candidate.id}`}>
                            {candidate.title ?? `SKU ${candidate.sourceSku}`}
                          </Link>
                          <small>{candidate.brandName ?? "Бренд не визначено"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="import-review-table__stack">
                        <span>GTIN: {candidate.normalizedGtin ?? "—"}</span>
                        <small>
                          SKU {candidate.sourceSku} · store {candidate.storeExternalId}
                        </small>
                      </span>
                    </td>
                    <td>
                      <span
                        className={`import-review-badge import-review-badge--${candidate.disposition.toLowerCase()}`}
                      >
                        {IMPORT_DISPOSITION_LABELS[candidate.disposition]}
                      </span>
                      {candidate.reasonCodes.length === 0 ? null : (
                        <small className="import-review-table__reason">
                          {candidate.reasonCodes.map(reasonCodeLabel).join(", ")}
                        </small>
                      )}
                    </td>
                    <td>
                      <span
                        className={`import-review-badge import-review-status--${candidate.status.toLowerCase()}`}
                      >
                        {IMPORT_STATUS_LABELS[candidate.status]}
                      </span>
                      {candidate.reviewedByEmail ? <small>{candidate.reviewedByEmail}</small> : null}
                    </td>
                    <td>{formatDate(candidate.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <nav className="import-review-pagination" aria-label="Сторінки кандидатів імпорту">
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

function asStatus(value: string | null): ProductImportCandidateStatus | undefined {
  return value === "PENDING" ||
    value === "IN_REVIEW" ||
    value === "APPROVED" ||
    value === "REJECTED" ||
    value === "DEFERRED" ||
    value === "PUBLISHED"
    ? value
    : undefined;
}

function asDisposition(value: string | null): ProductImportCandidateDisposition | undefined {
  return value === "CANDIDATE" || value === "REVIEW_REQUIRED" || value === "REJECTED"
    ? value
    : undefined;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Kyiv",
  }).format(new Date(value));
}
