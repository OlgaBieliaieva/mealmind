"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

import { Button } from "./button";

export interface ModalProps {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly closeLabel?: string;
  readonly onClose: () => void;
}

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  closeLabel = "Закрити діалогове вікно",
  onClose,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }

      return;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>): void {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="ui-modal"
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={handleBackdropClick}
    >
      <div className="ui-modal__surface">
        <header className="ui-modal__header">
          <div>
            <h2 className="ui-modal__title" id={titleId}>
              {title}
            </h2>

            {description === undefined ? null : (
              <p className="ui-modal__description" id={descriptionId}>
                {description}
              </p>
            )}
          </div>

          <Button variant="ghost" aria-label={closeLabel} onClick={onClose}>
            <span aria-hidden="true">×</span>
          </Button>
        </header>

        <div className="ui-modal__content">{children}</div>

        {footer === undefined ? null : <footer className="ui-modal__footer">{footer}</footer>}
      </div>
    </dialog>
  );
}
