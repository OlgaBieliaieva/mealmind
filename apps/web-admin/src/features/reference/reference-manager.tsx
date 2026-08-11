"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { getUserFacingErrorMessage } from "@/shared/api/api-error";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  archiveReferenceData,
  createReferenceData,
  listReferenceData,
  updateReferenceData,
  type ReferenceItem,
  type ReferenceResource,
  type ReferenceWriteData,
} from "@/shared/api/reference-data";
import { Button, Card, Modal, PageState, TextInput } from "@/shared/ui";

import { REFERENCE_CONFIGS, REFERENCE_NAVIGATION, type ReferenceOption } from "./reference-config";
import { ReferenceForm } from "./reference-form";

const PAGE_SIZE = 20;

interface FlatReferenceItem {
  readonly item: ReferenceItem;
  readonly depth: number;
}

export function ReferenceManager({ resource }: { readonly resource: ReferenceResource }) {
  const api = getBrowserApiClient();
  const queryClient = useQueryClient();
  const config = REFERENCE_CONFIGS[resource];
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState<
    { readonly mode: "create" } | { readonly mode: "edit"; readonly item: ReferenceItem } | null
  >(null);
  const [archiveItem, setArchiveItem] = useState<ReferenceItem | null>(null);
  const [operationMessage, setOperationMessage] = useState<string>();

  const query = useQuery({
    queryKey: ["admin-reference", resource, { search, includeInactive, page }],
    queryFn: () =>
      listReferenceData(api, {
        resource,
        ...(search === "" ? {} : { search }),
        includeInactive,
        page,
        pageSize: PAGE_SIZE,
      }),
  });
  const items = flattenReferenceItems(query.data?.data.items ?? []);
  const categoryOptions: readonly ReferenceOption[] = [
    { value: "", label: "Без батьківської категорії" },
    ...items.map(({ item, depth }) => ({
      value: item.id,
      label: `${"— ".repeat(depth)}${itemLabel(item)}`,
      disabled: formState?.mode === "edit" && formState.item.id === item.id,
    })),
  ];

  async function refresh(message: string) {
    await queryClient.invalidateQueries({ queryKey: ["admin-reference"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-reference-options"] });
    setOperationMessage(message);
  }

  const saveMutation = useMutation({
    mutationFn: async (data: ReferenceWriteData) => {
      if (formState === null) throw new Error("Reference form is closed");
      return formState.mode === "create"
        ? createReferenceData(api, resource, data)
        : updateReferenceData(api, resource, formState.item.id, data);
    },
    onSuccess: async () => {
      const message = formState?.mode === "create" ? "Значення створено." : "Зміни збережено.";
      setFormState(null);
      await refresh(message);
    },
  });
  const archiveMutation = useMutation({
    mutationFn: (item: ReferenceItem) => archiveReferenceData(api, resource, item.id),
    onSuccess: async () => {
      setArchiveItem(null);
      await refresh("Значення архівовано без фізичного видалення.");
    },
  });
  const restoreMutation = useMutation({
    mutationFn: (item: ReferenceItem) =>
      updateReferenceData(
        api,
        resource,
        item.id,
        resource === "brands" ? { status: "ACTIVE" } : { isActive: true },
      ),
    onSuccess: () => refresh("Значення відновлено."),
  });

  const totalPages = Math.max(1, Math.ceil((query.data?.meta.total ?? 0) / PAGE_SIZE));

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  }

  function openCreateForm() {
    saveMutation.reset();
    setFormState({ mode: "create" });
  }

  function openEditForm(item: ReferenceItem) {
    saveMutation.reset();
    setFormState({ mode: "edit", item });
  }

  function openArchiveConfirmation(item: ReferenceItem) {
    archiveMutation.reset();
    setArchiveItem(item);
  }

  return (
    <section className="admin-page reference-page" aria-labelledby="reference-title">
      <header className="reference-page__header">
        <div>
          <p className="admin-page__eyebrow">Довідникові каталоги</p>
          <h1 id="reference-title">{config.label}</h1>
          <p className="admin-page__description">{config.description}</p>
        </div>
        <Button onClick={openCreateForm}>Створити {config.itemLabel}</Button>
      </header>

      <nav className="reference-resource-nav" aria-label="Довідникові каталоги">
        <ul>
          {REFERENCE_NAVIGATION.map((item) => (
            <li key={item.resource}>
              <Link
                href={`/reference/${item.resource}`}
                aria-current={item.resource === resource ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Card>
        <form className="reference-filters" role="search" onSubmit={submitSearch}>
          <TextInput
            label="Пошук"
            placeholder="Код або назва"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          <label className="reference-form__checkbox">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => {
                setIncludeInactive(event.target.checked);
                setPage(1);
              }}
            />
            Показувати архівні
          </label>
          <Button type="submit" variant="secondary">
            Застосувати
          </Button>
        </form>
      </Card>

      {operationMessage === undefined ? null : (
        <p className="reference-operation-message" role="status">
          {operationMessage}
        </p>
      )}
      {query.isPending ? <PageState kind="loading" title="Завантажуємо довідник" /> : null}
      {query.isError ? (
        <PageState
          kind="error"
          title="Не вдалося завантажити довідник"
          description={getUserFacingErrorMessage(query.error)}
          actions={<Button onClick={() => void query.refetch()}>Повторити</Button>}
        />
      ) : null}
      {query.data !== undefined && items.length === 0 ? (
        <PageState
          kind="empty"
          title="Значень не знайдено"
          description="Змініть пошук або створіть нове значення."
        />
      ) : null}

      {items.length === 0 ? null : (
        <Card padding="none">
          <div className="reference-table-scroll">
            <table className="reference-table">
              <caption>Знайдено значень: {query.data?.meta.total ?? items.length}</caption>
              <thead>
                <tr>
                  <th scope="col">Назва</th>
                  <th scope="col">Код / тип</th>
                  <th scope="col">Статус</th>
                  <th scope="col">Дії</th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ item, depth }) => {
                  const active = isActive(item, resource);
                  const status = statusPresentation(item, resource);
                  return (
                    <tr key={item.id}>
                      <td>
                        <span style={{ paddingInlineStart: `${depth * 1.25}rem` }}>
                          {itemLabel(item)}
                        </span>
                      </td>
                      <td>{secondaryLabel(item)}</td>
                      <td>
                        <span className={`reference-status reference-status--${status.style}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="reference-table__actions">
                          <Button variant="ghost" onClick={() => openEditForm(item)}>
                            Редагувати
                          </Button>
                          {active ? (
                            <Button variant="danger" onClick={() => openArchiveConfirmation(item)}>
                              Архівувати
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              isLoading={restoreMutation.isPending}
                              onClick={() => restoreMutation.mutate(item)}
                            >
                              Відновити
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {resource === "product-categories" ? null : (
        <nav className="reference-pagination" aria-label="Сторінки довідника">
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
      )}

      <Modal
        open={formState !== null}
        title={
          formState?.mode === "edit"
            ? `Редагувати: ${itemLabel(formState.item)}`
            : `Створити ${config.itemLabel}`
        }
        description="Поля перевіряються у web-admin та повторно в API."
        onClose={() => {
          if (!saveMutation.isPending) setFormState(null);
        }}
      >
        {formState === null ? null : (
          <ReferenceForm
            key={formState.mode === "edit" ? formState.item.id : `new-${resource}`}
            config={config}
            mode={formState.mode}
            {...(formState.mode === "edit" ? { item: formState.item } : {})}
            categoryOptions={categoryOptions}
            isSubmitting={saveMutation.isPending}
            submitError={
              saveMutation.isError ? getUserFacingErrorMessage(saveMutation.error) : undefined
            }
            onSubmit={(data) => saveMutation.mutateAsync(data).then(() => undefined)}
            onCancel={() => setFormState(null)}
          />
        )}
      </Modal>

      <Modal
        open={archiveItem !== null}
        title="Архівувати значення?"
        description="Запис залишиться в базі та може бути відновлений."
        onClose={() => {
          if (!archiveMutation.isPending) setArchiveItem(null);
        }}
        footer={
          <>
            <Button variant="secondary" onClick={() => setArchiveItem(null)}>
              Скасувати
            </Button>
            <Button
              variant="danger"
              isLoading={archiveMutation.isPending}
              loadingLabel="Архівуємо…"
              onClick={() => {
                if (archiveItem !== null) archiveMutation.mutate(archiveItem);
              }}
            >
              Архівувати
            </Button>
          </>
        }
      >
        <p>{archiveItem === null ? "" : itemLabel(archiveItem)}</p>
        {archiveMutation.isError ? (
          <p className="reference-form__error" role="alert">
            {getUserFacingErrorMessage(archiveMutation.error)}
          </p>
        ) : null}
      </Modal>
    </section>
  );
}

export function flattenReferenceItems(
  items: readonly ReferenceItem[],
  depth = 0,
): readonly FlatReferenceItem[] {
  return items.flatMap((item) => [
    { item, depth },
    ...flattenReferenceItems(
      Array.isArray(item.children) ? (item.children as readonly ReferenceItem[]) : [],
      depth + 1,
    ),
  ]);
}

function itemLabel(item: ReferenceItem): string {
  for (const field of ["nameUa", "displayName", "name", "nameEn", "code"]) {
    if (typeof item[field] === "string") return item[field];
  }
  return item.id;
}

function secondaryLabel(item: ReferenceItem): string {
  for (const field of ["code", "slug", "symbol", "kind", "type"]) {
    if (typeof item[field] === "string") return item[field];
  }
  return "—";
}

function isActive(item: ReferenceItem, resource: ReferenceResource): boolean {
  return resource === "brands" ? item.status !== "ARCHIVED" : item.isActive !== false;
}

function statusPresentation(
  item: ReferenceItem,
  resource: ReferenceResource,
): { readonly label: string; readonly style: "active" | "draft" | "archived" } {
  if (resource === "brands") {
    if (item.status === "ARCHIVED") return { label: "Архівний", style: "archived" };
    if (item.status === "DRAFT") return { label: "Чернетка", style: "draft" };
    return { label: "Активний", style: "active" };
  }
  return item.isActive === false
    ? { label: "Архівне", style: "archived" }
    : { label: "Активне", style: "active" };
}
