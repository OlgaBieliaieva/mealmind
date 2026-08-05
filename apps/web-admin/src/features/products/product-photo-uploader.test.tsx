import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { ProductPhotoUploader } from "./product-photo-uploader";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  uploadToSignedUrl: vi.fn(),
}));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({ post: mocks.post }),
}));

vi.mock("@/config/env", () => ({
  readWebEnv: () => ({}),
}));

vi.mock("@/shared/supabase/browser-client", () => ({
  getBrowserSupabaseClient: () => ({
    storage: { from: () => ({ uploadToSignedUrl: mocks.uploadToSignedUrl }) },
  }),
}));

const productId = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";

describe("ProductPhotoUploader", () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.uploadToSignedUrl.mockReset();
  });

  it("uses shared media labels and exposes accessible progress controls", async () => {
    const { container } = render(
      <ProductPhotoUploader productId={productId} media={[]} onChanged={vi.fn()} />,
    );

    expect(screen.getByRole("combobox", { name: "Тип фото" })).toHaveValue("PRODUCT");
    expect(screen.getByRole("option", { name: "Харчова цінність" })).toBeInTheDocument();
    await validateRenderedUi(container);
  });

  it("rejects an unsupported file before creating an upload reservation", async () => {
    render(<ProductPhotoUploader productId={productId} media={[]} onChanged={vi.fn()} />);
    const input = screen.getByLabelText("Файл");
    const file = new File(["<svg />"], "unsafe.svg", { type: "image/svg+xml" });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Завантажити фото" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Дозволено JPEG, PNG або WebP до 5 MiB"),
    );
  });

  it("completes reservation, signed upload and processing in order", async () => {
    const onChanged = vi.fn();
    const path = `products/${productId}/media/original.png`;
    mocks.post
      .mockResolvedValueOnce({
        data: {
          media: { id: "34b79ffc-e6af-440c-ae38-8cd37c22be1c", storageObjectPath: path },
          uploadUrl: "https://storage.example/signed",
          token: "signed-token",
        },
      })
      .mockResolvedValueOnce({ data: { status: "ACTIVE" } });
    mocks.uploadToSignedUrl.mockResolvedValue({ data: { path }, error: null });
    render(<ProductPhotoUploader productId={productId} media={[]} onChanged={onChanged} />);
    const file = new File(["png"], "apple.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText("Файл"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Завантажити фото" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
    expect(mocks.uploadToSignedUrl).toHaveBeenCalledWith(path, "signed-token", file, {
      contentType: "image/png",
    });
    expect(mocks.post).toHaveBeenCalledTimes(2);
  });
});
