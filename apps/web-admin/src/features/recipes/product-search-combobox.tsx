"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";

import type { RecipeProductOption } from "./recipe-form";

interface ProductSearchComboboxProps {
  readonly value: string;
  readonly initialOptions: readonly RecipeProductOption[];
  readonly error?: string | undefined;
  readonly inputRef?: Ref<HTMLInputElement>;
  readonly onBlur?: () => void;
  readonly onChange: (value: string) => void;
  readonly onSearch: (query: string) => Promise<readonly RecipeProductOption[]>;
}

export function ProductSearchCombobox({
  value,
  initialOptions,
  error,
  inputRef,
  onBlur,
  onChange,
  onSearch,
}: ProductSearchComboboxProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = initialOptions.find((item) => item.value === value) ?? null;
  const [selected, setSelected] = useState<RecipeProductOption | null>(initial);
  const [query, setQuery] = useState(initial?.label ?? "");
  const [results, setResults] = useState<readonly RecipeProductOption[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const normalized = query.trim();
    if (!isOpen || normalized.length < 2 || normalized === selected?.label) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      void onSearch(normalized)
        .then((items) => {
          if (!active) return;
          setResults(items);
          setStatus("success");
        })
        .catch(() => {
          if (!active) return;
          setResults([]);
          setStatus("error");
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isOpen, onSearch, query, selected?.label]);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  function choose(option: RecipeProductOption) {
    setSelected(option);
    setQuery(option.label);
    setResults([]);
    setStatus("idle");
    setIsOpen(false);
    onChange(option.value);
  }

  const message =
    query.trim().length < 2
      ? "Введіть щонайменше 2 символи."
      : status === "loading"
        ? "Шукаємо продукти…"
        : status === "error"
          ? "Не вдалося виконати пошук. Спробуйте ще раз."
          : status === "success" && results.length === 0
            ? "Продуктів не знайдено."
            : null;

  return (
    <div className="ui-field recipe-product-search" ref={rootRef}>
      <label className="ui-field__label" htmlFor={`${id}-input`}>
        Продукт
        <span className="ui-field__required" aria-hidden="true">
          *
        </span>
      </label>
      <div className="recipe-product-search__control">
        <input
          id={`${id}-input`}
          ref={inputRef}
          className="ui-control"
          type="search"
          role="combobox"
          autoComplete="off"
          value={query}
          aria-expanded={isOpen}
          aria-controls={`${id}-results`}
          aria-autocomplete="list"
          aria-invalid={error === undefined ? undefined : true}
          aria-errormessage={error === undefined ? undefined : `${id}-error`}
          placeholder="Почніть вводити назву продукту"
          onBlur={onBlur}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setResults([]);
            setStatus(event.target.value.trim().length < 2 ? "idle" : "loading");
            setIsOpen(true);
            onChange("");
          }}
        />
        {selected === null ? null : (
          <button
            type="button"
            className="recipe-product-search__clear"
            aria-label="Очистити вибраний продукт"
            onClick={() => {
              setSelected(null);
              setQuery("");
              setResults([]);
              setStatus("idle");
              setIsOpen(false);
              onChange("");
            }}
          >
            ×
          </button>
        )}
      </div>

      {isOpen ? (
        <div className="recipe-product-search__results" id={`${id}-results`} role="listbox">
          {message === null ? null : (
            <p className="recipe-product-search__message" role="status">
              {message}
            </p>
          )}
          {results.map((option) => (
            <button
              type="button"
              className="recipe-product-search__option"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.description === undefined ? null : <small>{option.description}</small>}
            </button>
          ))}
        </div>
      ) : null}

      {error === undefined ? null : (
        <span className="ui-field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
