import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { ProductStatusActions } from "./product-status-actions";

describe("ProductStatusActions", () => {
  it("exposes valid draft transitions with semantic accessible controls", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <ProductStatusActions status="DRAFT" isPending={false} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Активувати" }));
    expect(onChange).toHaveBeenCalledWith("ACTIVE");
    expect(screen.getByRole("button", { name: "Архівувати" })).toBeInTheDocument();
    await validateRenderedUi(container);
  });

  it("offers only draft restoration for an archived product", () => {
    render(<ProductStatusActions status="ARCHIVED" isPending={false} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Відновити як чернетку" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Активувати" })).not.toBeInTheDocument();
  });
});
