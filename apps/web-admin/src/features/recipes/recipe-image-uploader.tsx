"use client";

import { useRef, useState } from "react";

import { readWebEnv } from "@/config/env";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  completeRecipeMedia,
  deleteRecipeMedia,
  reserveRecipeMedia,
  type RecipeImage,
} from "@/shared/api/recipes";
import { getBrowserSupabaseClient } from "@/shared/supabase/browser-client";
import { Button, Card, TextInput } from "@/shared/ui";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export function RecipeImageUploader({
  recipeId,
  images,
  onChanged,
}: {
  readonly recipeId: string;
  readonly images: readonly RecipeImage[];
  readonly onChanged: () => Promise<void> | void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [altTextUa, setAltTextUa] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const api = getBrowserApiClient();
  const storage = getBrowserSupabaseClient(readWebEnv()).storage.from("recipe-media");

  async function upload(): Promise<void> {
    const file = fileInput.current?.files?.[0];
    setError(null);
    if (file === undefined) {
      setError("Оберіть файл");
      return;
    }
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_BYTES) {
      setError("Дозволено JPEG, PNG або WebP до 5 MiB");
      return;
    }

    try {
      setProgress(0);
      const reservation = await reserveRecipeMedia(api, recipeId, {
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
        byteSize: file.size,
        ...(altTextUa.trim() === "" ? {} : { altTextUa: altTextUa.trim() }),
      });
      setProgress(35);
      const { error: uploadError } = await storage.uploadToSignedUrl(
        reservation.data.media.storageObjectPath,
        reservation.data.token,
        file,
        { contentType: file.type },
      );
      if (uploadError !== null) throw new Error("Storage upload failed", { cause: uploadError });
      setProgress(80);
      await completeRecipeMedia(api, recipeId, reservation.data.media.id);
      setProgress(null);
      setAltTextUa("");
      if (fileInput.current !== null) fileInput.current.value = "";
      await onChanged();
    } catch {
      setProgress(null);
      setError("Не вдалося завантажити й обробити зображення. Повторіть спробу.");
    }
  }

  return (
    <section className="recipe-media" aria-labelledby="recipe-media-title">
      <h2 id="recipe-media-title">Зображення рецепта</h2>
      <p className="recipe-form__hint">
        Перше успішно завантажене зображення автоматично стає основним.
      </p>
      <Card>
        <div className="recipe-media__form">
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="recipe-image-file">
              Файл
            </label>
            <input
              ref={fileInput}
              id="recipe-image-file"
              className="ui-control"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
            <p className="ui-field__description">JPEG, PNG або WebP, максимум 5 MiB.</p>
          </div>
          <TextInput
            label="Альтернативний текст українською"
            value={altTextUa}
            onChange={(event) => setAltTextUa(event.target.value)}
          />
          <Button
            onClick={() => void upload()}
            isLoading={progress !== null}
            loadingLabel="Завантажуємо…"
          >
            Завантажити зображення
          </Button>
          {progress === null ? null : (
            <div className="recipe-media__progress" role="status" aria-live="polite">
              <progress max="100" value={progress} /> {progress}%
            </div>
          )}
          {error === null ? null : (
            <p className="ui-field__error" role="alert">
              {error}
            </p>
          )}
        </div>
      </Card>

      {images.length === 0 ? <p>Зображення ще не додані.</p> : null}
      <ul className="recipe-media__grid">
        {images.map((item) => (
          <li key={item.id}>
            <Card className="recipe-media__card">
              {item.thumbnailUrl === null ? (
                <div className="recipe-media__placeholder">Зображення обробляється</div>
              ) : (
                // Signed URL points only to a server-validated private thumbnail.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl}
                  alt={item.altTextUa ?? "Зображення рецепта"}
                  width="360"
                  height="240"
                />
              )}
              <p>{item.isPrimary ? <strong>Основне зображення</strong> : "Додаткове зображення"}</p>
              <Button
                variant="danger"
                onClick={async () => {
                  setError(null);
                  try {
                    await deleteRecipeMedia(api, recipeId, item.id);
                    await onChanged();
                  } catch {
                    setError("Не вдалося видалити зображення");
                  }
                }}
              >
                Видалити зображення
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
