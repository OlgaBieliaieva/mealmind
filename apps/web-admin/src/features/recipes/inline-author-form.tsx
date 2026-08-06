"use client";
import { useState, type FormEvent } from "react";
import { Button, SelectField, TextInput } from "@/shared/ui";
export function InlineAuthorForm({
  isPending,
  onCreate,
}: {
  readonly isPending: boolean;
  readonly onCreate: (data: {
    readonly type: string;
    readonly slug: string;
    readonly displayName: string;
  }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("MEALMIND");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!displayName.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return;
    await onCreate({ type, slug, displayName: displayName.trim() });
    setDisplayName("");
    setSlug("");
  }
  return (
    <form className="inline-author" onSubmit={submit} aria-labelledby="inline-author-title">
      <h2 id="inline-author-title">Швидко створити автора</h2>
      <div className="recipe-form__grid">
        <TextInput
          label="Ім’я автора"
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <TextInput
          label="Slug автора"
          required
          description="Латинські літери, цифри та дефіси."
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
        />
        <SelectField
          label="Тип автора"
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={[
            { value: "MEALMIND", label: "MealMind" },
            { value: "EXPERT", label: "Експерт" },
            { value: "BLOGGER", label: "Блогер" },
            { value: "USER", label: "Користувач" },
          ]}
        />
      </div>
      <Button type="submit" variant="secondary" isLoading={isPending} loadingLabel="Створюємо…">
        Створити автора
      </Button>
    </form>
  );
}
