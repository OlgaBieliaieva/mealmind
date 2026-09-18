"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Modal } from "@/shared/ui";

interface BarcodeScannerProps {
  readonly open: boolean;
  readonly onDetected: (value: string) => void;
  readonly onClose: () => void;
}

export function BarcodeScanner({ open, onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const video = videoRef.current;
    if (video === null) return;

    void import("@zxing/browser")
      .then(async ({ BarcodeFormat, BrowserMultiFormatReader }) => {
        if (!active) return;
        const reader = new BrowserMultiFormatReader();
        reader.possibleFormats = [
          BarcodeFormat.EAN_8,
          BarcodeFormat.EAN_13,
          BarcodeFormat.UPC_A,
          BarcodeFormat.ITF,
        ];
        const controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          video,
          (result) => {
            if (!active || result === undefined) return;
            const value = result.getText().trim();
            if (!/^\d{8}$|^\d{12,14}$/.test(value)) return;
            controlsRef.current?.stop();
            onDetected(value);
            onClose();
          },
        );
        if (!active) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch(() => {
        if (active) {
          setError("Не вдалося відкрити камеру. Перевірте дозвіл або введіть GTIN вручну.");
        }
      });

    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
      const stream = video.srcObject;
      if (typeof MediaStream !== "undefined" && stream instanceof MediaStream) {
        for (const track of stream.getTracks()) track.stop();
      }
    };
  }, [onClose, onDetected, open]);

  return (
    <Modal
      open={open}
      title="Сканувати штрихкод"
      description="Наведіть камеру на EAN або GTIN на пакуванні."
      onClose={onClose}
      footer={<Button onClick={onClose}>Скасувати</Button>}
    >
      <video ref={videoRef} className="product-barcode-scanner__video" muted playsInline />
      {error === null ? (
        <p className="product-form__hint" role="status">
          Камера працює лише через HTTPS і після надання дозволу.
        </p>
      ) : (
        <p className="ui-field__error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
