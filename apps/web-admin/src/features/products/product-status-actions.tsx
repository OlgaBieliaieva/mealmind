"use client";

import type { ProductStatus } from "@/shared/api/products";
import { Button, Card } from "@/shared/ui";

import { PRODUCT_STATUS_LABELS } from "./product-labels";

export interface ProductStatusActionsProps {
  readonly status: ProductStatus;
  readonly isPending: boolean;
  readonly onChange: (status: ProductStatus) => void;
}

export function ProductStatusActions({ status, isPending, onChange }: ProductStatusActionsProps) {
  return (
    <Card className="product-status-actions">
      <div>
        <h2>Lifecycle status</h2>
        <p>
          Поточний статус: <strong>{PRODUCT_STATUS_LABELS[status]}</strong>
        </p>
      </div>
      <div className="product-form__actions">
        {status === "DRAFT" ? (
          <Button disabled={isPending} onClick={() => onChange("ACTIVE")}>
            Активувати
          </Button>
        ) : null}
        {status !== "ARCHIVED" ? (
          <Button variant="danger" disabled={isPending} onClick={() => onChange("ARCHIVED")}>
            Архівувати
          </Button>
        ) : (
          <Button variant="secondary" disabled={isPending} onClick={() => onChange("DRAFT")}>
            Відновити як чернетку
          </Button>
        )}
      </div>
    </Card>
  );
}
