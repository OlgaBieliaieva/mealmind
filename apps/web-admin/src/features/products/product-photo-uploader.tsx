"use client";

import { useRef, useState } from "react";

import { readWebEnv } from "@/config/env";
import { getBrowserApiClient } from "@/shared/api/browser-api-client";
import {
  completeProductMedia,
  deleteProductMedia,
  reserveProductMedia,
  type ProductMedia,
  type ProductMediaKind,
} from "@/shared/api/products";
import { getBrowserSupabaseClient } from "@/shared/supabase/browser-client";
import { Button, Card, SelectField, TextInput } from "@/shared/ui";

import { PRODUCT_MEDIA_KIND_LABELS } from "./product-labels";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export interface ProductPhotoUploaderProps {
  readonly productId: string;
  readonly media: readonly ProductMedia[];
  readonly onChanged: () => Promise<void> | void;
}

export function ProductPhotoUploader({ productId, media, onChanged }: ProductPhotoUploaderProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<ProductMediaKind>("PRODUCT");
  const [altTextUa, setAltTextUa] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiClient = getBrowserApiClient();
  const storage = getBrowserSupabaseClient(readWebEnv()).storage.from("product-media");

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
      const reservation = await reserveProductMedia(apiClient, productId, {
        kind,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
        byteSize: file.size,
        ...(altTextUa.trim() === "" ? {} : { altTextUa: altTextUa.trim() }),
        isPrimary,
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
      await completeProductMedia(apiClient, productId, reservation.data.media.id);
      setProgress(null);
      setAltTextUa("");
      setIsPrimary(false);
      if (fileInput.current !== null) fileInput.current.value = "";
      await onChanged();
    } catch {
      setProgress(null);
      setError("Не вдалося завантажити й обробити фото. Повторіть спробу.");
    }
  }

  return (
    <section className="product-media" aria-labelledby="product-media-title">
      <h2 id="product-media-title">Фото продукту</h2>
      <Card>
        <div className="product-media__form">
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="product-photo-file">
              Файл
            </label>
            <input
              ref={fileInput}
              id="product-photo-file"
              className="ui-control"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
            <p className="ui-field__description">JPEG, PNG або WebP, максимум 5 MiB.</p>
          </div>
          <SelectField
            label="Тип фото"
            value={kind}
            options={Object.entries(PRODUCT_MEDIA_KIND_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(event) => setKind(event.target.value as ProductMediaKind)}
          />
          <TextInput
            label="Альтернативний текст українською"
            value={altTextUa}
            onChange={(event) => setAltTextUa(event.target.value)}
          />
          <label className="product-form__checkbox">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            Основне фото
          </label>
          <Button
            onClick={() => void upload()}
            isLoading={progress !== null}
            loadingLabel="Завантажуємо…"
          >
            Завантажити фото
          </Button>
          {progress === null ? null : (
            <div className="product-media__progress" role="status" aria-live="polite">
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

      {media.length === 0 ? <p>Фото ще не додані.</p> : null}
      <ul className="product-media__grid">
        {media.map((item) => (
          <li key={item.id}>
            <Card className="product-media__card">
              {item.thumbnailUrl === null ? (
                <div className="product-media__placeholder">Фото обробляється</div>
              ) : (
                // Signed URL points to a validated private thumbnail.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl}
                  alt={item.altTextUa ?? PRODUCT_MEDIA_KIND_LABELS[item.kind]}
                  width="240"
                  height="180"
                />
              )}
              <p>
                <strong>{PRODUCT_MEDIA_KIND_LABELS[item.kind]}</strong>
                {item.isPrimary ? " · основне" : ""}
              </p>
              <Button
                variant="danger"
                onClick={async () => {
                  setError(null);
                  try {
                    await deleteProductMedia(apiClient, productId, item.id);
                    await onChanged();
                  } catch {
                    setError("Не вдалося видалити фото");
                  }
                }}
              >
                Видалити фото
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
