"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface BaseProductOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

interface BaseProductSearchProps {
  readonly value: string;
  readonly initialOptions: readonly BaseProductOption[];
  readonly error?: string;
  readonly disabled?: boolean;
  readonly onChange: (value: string) => void;
  readonly onSearch: (query: string) => Promise<readonly BaseProductOption[]>;
}

export function BaseProductSearch({
  value,
  initialOptions,
  error,
  disabled = false,
  onChange,
  onSearch,
}: BaseProductSearchProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const initial = initialOptions.find((item) => item.value === value) ?? null;
  const [selected, setSelected] = useState<BaseProductOption | null>(initial);
  const [query, setQuery] = useState(initial?.label ?? "");
  const [results, setResults] = useState<readonly BaseProductOption[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const normalized = query.trim();
    if (!isOpen || disabled || normalized.length < 2 || normalized === selected?.label) return;

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
  }, [disabled, isOpen, onSearch, query, selected?.label]);

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const message =
    query.trim().length < 2
      ? "Введіть щонайменше 2 символи."
      : status === "loading"
        ? "Шукаємо generic-продукти…"
        : status === "error"
          ? "Не вдалося виконати пошук."
          : status === "success" && results.length === 0
            ? "Продуктів не знайдено."
            : null;

  return (
    <div className="ui-field product-base-search" ref={rootRef}>
      <label className="ui-field__label" htmlFor={id}>
        Базовий generic-продукт
      </label>
      <p className="ui-field__description">
        Необов’язково. Категорія й одиниця будуть підставлені автоматично.
      </p>
      <div className="product-base-search__control">
        <input
          id={id}
          className="ui-control"
          type="search"
          role="combobox"
          autoComplete="off"
          value={query}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-controls={id + "-results"}
          aria-autocomplete="list"
          aria-invalid={error === undefined ? undefined : true}
          aria-errormessage={error === undefined ? undefined : id + "-error"}
          placeholder="Почніть вводити назву"
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
        {selected === null || disabled ? null : (
          <button
            type="button"
            className="product-base-search__clear"
            aria-label="Очистити базовий продукт"
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
      {isOpen && !disabled ? (
        <div className="product-base-search__results" id={id + "-results"} role="listbox">
          {message === null ? null : (
            <p className="product-base-search__message" role="status">
              {message}
            </p>
          )}
          {results.map((option) => (
            <button
              type="button"
              className="product-base-search__option"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                setSelected(option);
                setQuery(option.label);
                setResults([]);
                setStatus("idle");
                setIsOpen(false);
                onChange(option.value);
              }}
            >
              <span>{option.label}</span>
              {option.description === undefined ? null : <small>{option.description}</small>}
            </button>
          ))}
        </div>
      ) : null}
      {error === undefined ? null : (
        <p className="ui-field__error" id={id + "-error"} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
