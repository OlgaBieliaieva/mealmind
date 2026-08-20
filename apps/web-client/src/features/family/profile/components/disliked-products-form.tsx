"use client";

import { useMemo, useState, type FormEvent } from "react";

import type { OwnProfile, ProfileProduct } from "@/shared/api/family";

import type { ProductSearchItem } from "@/shared/api/products";

import { Button, Modal, TextInput, Typography } from "@/shared/ui";

import { useDebouncedValue } from "../hooks/use-debounced-value";

import { useProductSearch } from "../hooks/use-product-search";

interface DislikedProductsFormProps {
  readonly open: boolean;
  readonly profile: OwnProfile;
  readonly isPending: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (productIds: readonly string[]) => void;
}

interface SelectedProduct {
  readonly id: string;
  readonly name: string;
}

function toSelectedProduct(product: ProfileProduct | ProductSearchItem): SelectedProduct {
  return {
    id: product.id,
    name: product.name,
  };
}

export function DislikedProductsForm({
  open,
  profile,
  isPending,
  onClose,
  onSubmit,
}: DislikedProductsFormProps) {
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebouncedValue(search, 350);

  const [selectedProducts, setSelectedProducts] = useState<ReadonlyMap<string, SelectedProduct>>(
    () =>
      new Map(profile.dislikedProducts.map((product) => [product.id, toSelectedProduct(product)])),
  );

  const productSearch = useProductSearch(debouncedSearch);

  const searchItems = useMemo(
    () => productSearch.data?.pages.flatMap((page) => page.items) ?? [],
    [productSearch.data],
  );

  const selectedList = useMemo(
    () =>
      [...selectedProducts.values()].sort((left, right) =>
        left.name.localeCompare(right.name, "uk-UA"),
      ),
    [selectedProducts],
  );

  const initialIds = useMemo(
    () => new Set(profile.dislikedProducts.map((product) => product.id)),
    [profile.dislikedProducts],
  );

  const isDirty = useMemo(() => {
    if (selectedProducts.size !== initialIds.size) {
      return true;
    }

    return [...selectedProducts.keys()].some((id) => !initialIds.has(id));
  }, [initialIds, selectedProducts]);

  function addProduct(product: ProductSearchItem): void {
    setSelectedProducts((current) => {
      if (current.has(product.id)) {
        return current;
      }

      const next = new Map(current);

      next.set(product.id, toSelectedProduct(product));

      return next;
    });
  }

  function removeProduct(productId: string): void {
    setSelectedProducts((current) => {
      if (!current.has(productId)) {
        return current;
      }

      const next = new Map(current);

      next.delete(productId);

      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!isDirty) {
      onClose();
      return;
    }

    onSubmit([...selectedProducts.keys()]);
  }

  const trimmedSearch = search.trim();

  const showSearchHint = trimmedSearch.length > 0 && trimmedSearch.length < 2;

  const showEmptyResults =
    debouncedSearch.trim().length >= 2 && !productSearch.isPending && searchItems.length === 0;

  return (
    <Modal
      open={open}
      title="Небажані продукти"
      description="Додайте продукти, які MealMind не повинен пропонувати у вашому персональному плані харчування."
      onClose={() => {
        if (!isPending) {
          onClose();
        }
      }}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={isPending} onClick={onClose}>
            Скасувати
          </Button>

          <Button
            type="submit"
            form="disliked-products-form"
            isLoading={isPending}
            disabled={!isDirty}
          >
            Зберегти
          </Button>
        </>
      }
    >
      <form
        id="disliked-products-form"
        className="profile-edit-form profile-disliked-products-form"
        onSubmit={handleSubmit}
      >
        <div className="profile-disliked-products-search">
          <TextInput
            label="Пошук продуктів"
            value={search}
            placeholder="Наприклад, селера"
            disabled={isPending}
            onChange={(event) => {
              setSearch(event.target.value);
            }}
          />

          {showSearchHint ? (
            <Typography variant="supporting">Введіть щонайменше 2 символи.</Typography>
          ) : null}
        </div>

        <div className="profile-disliked-products-section">
          <Typography as="h3" variant="item-title">
            Обрані продукти
          </Typography>

          {selectedList.length === 0 ? (
            <Typography variant="supporting">Небажані продукти ще не додані.</Typography>
          ) : (
            <div className="profile-disliked-products-selected">
              {selectedList.map((product) => (
                <div key={product.id} className="profile-disliked-products-selected__item">
                  <Typography variant="body">{product.name}</Typography>

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => {
                      removeProduct(product.id);
                    }}
                  >
                    Видалити
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="profile-disliked-products-section">
          <Typography as="h3" variant="item-title">
            Результати пошуку
          </Typography>

          {debouncedSearch.trim().length < 2 ? (
            <Typography variant="supporting">
              Почніть вводити назву продукту, щоб знайти його в каталозі.
            </Typography>
          ) : null}

          {productSearch.isPending ? (
            <Typography variant="supporting">Пошук продуктів…</Typography>
          ) : null}

          {showEmptyResults ? (
            <Typography variant="supporting">
              За цим запитом активних продуктів не знайдено.
            </Typography>
          ) : null}

          {searchItems.length > 0 ? (
            <div className="profile-disliked-products-results">
              {searchItems.map((product) => {
                const isSelected = selectedProducts.has(product.id);

                return (
                  <div key={product.id} className="profile-disliked-product-result">
                    <div className="profile-disliked-product-result__content">
                      <Typography variant="body">{product.name}</Typography>

                      <Typography variant="caption">
                        {product.brandName === null
                          ? product.categoryName
                          : `${product.brandName} · ${product.categoryName}`}
                      </Typography>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      disabled={isPending || isSelected}
                      onClick={() => {
                        addProduct(product);
                      }}
                    >
                      {isSelected ? "Додано" : "Додати"}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {productSearch.hasNextPage ? (
            <Button
              type="button"
              variant="secondary"
              isLoading={productSearch.isFetchingNextPage}
              disabled={productSearch.isFetchingNextPage || isPending}
              onClick={() => {
                void productSearch.fetchNextPage();
              }}
            >
              Показати ще
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
