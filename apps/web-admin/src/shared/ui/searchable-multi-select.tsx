"use client";

import { useId, useMemo, useState } from "react";

export interface MultiSelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SearchableMultiSelectProps {
  readonly label: string;
  readonly options: readonly MultiSelectOption[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
}

export function SearchableMultiSelect({
  label,
  options,
  value,
  onChange,
}: SearchableMultiSelectProps) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("uk");
    if (normalizedQuery.length === 0) return options;
    return options.filter((item) => item.label.toLocaleLowerCase("uk").includes(normalizedQuery));
  }, [options, query]);

  function toggle(option: MultiSelectOption) {
    onChange(
      selected.has(option.value)
        ? value.filter((item) => item !== option.value)
        : [...value, option.value],
    );
  }

  const selectedLabels = options
    .filter((item) => selected.has(item.value))
    .map((item) => item.label);

  return (
    <div className="ui-field ui-multi-select">
      <span className="ui-field__label" id={`${id}-label`}>
        {label}
      </span>
      <button
        type="button"
        className="ui-control ui-multi-select__toggle"
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span id={`${id}-value`}>
          {selectedLabels.length === 0
            ? "Нічого не вибрано"
            : selectedLabels.length <= 2
              ? selectedLabels.join(", ")
              : `Вибрано: ${selectedLabels.length}`}
        </span>
        <span aria-hidden="true">⌄</span>
      </button>

      {isOpen ? (
        <div className="ui-multi-select__panel" id={`${id}-panel`}>
          <label className="ui-field">
            <span className="ui-field__label">Пошук за назвою</span>
            <input
              className="ui-control"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="ui-multi-select__options" role="group" aria-label={label}>
            {filtered.length === 0 ? (
              <p className="ui-multi-select__empty">Збігів не знайдено.</p>
            ) : (
              filtered.map((item) => (
                <label className="ui-multi-select__option" key={item.value}>
                  <input
                    type="checkbox"
                    checked={selected.has(item.value)}
                    onChange={() => toggle(item)}
                  />
                  <span>{item.label}</span>
                </label>
              ))
            )}
          </div>
          <button type="button" className="ui-multi-select__done" onClick={() => setIsOpen(false)}>
            Готово
          </button>
        </div>
      ) : null}
    </div>
  );
}
