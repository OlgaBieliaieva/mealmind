import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateRenderedUi } from "@/test/ui-quality";

import { RecipeImageUploader } from "./recipe-image-uploader";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  delete: vi.fn(),
  uploadToSignedUrl: vi.fn(),
}));

vi.mock("@/shared/api/browser-api-client", () => ({
  getBrowserApiClient: () => ({ post: mocks.post, delete: mocks.delete }),
}));
vi.mock("@/config/env", () => ({ readWebEnv: () => ({}) }));
vi.mock("@/shared/supabase/browser-client", () => ({
  getBrowserSupabaseClient: () => ({
    storage: { from: () => ({ uploadToSignedUrl: mocks.uploadToSignedUrl }) },
  }),
}));

const recipeId = "24b79ffc-e6af-440c-ae38-8cd37c22be1c";

describe("RecipeImageUploader", () => {
  beforeEach(() => {
    mocks.post.mockReset();
    mocks.delete.mockReset();
    mocks.uploadToSignedUrl.mockReset();
  });

  it("renders an accessible empty upload state", async () => {
    const { container } = render(
      <RecipeImageUploader recipeId={recipeId} images={[]} onChanged={vi.fn()} />,
    );
    expect(screen.getByRole("heading", { name: "Зображення рецепта" })).toBeInTheDocument();
    expect(screen.getByText("Зображення ще не додані.")).toBeInTheDocument();
    await validateRenderedUi(container);
  });

  it("rejects an unsupported file before reserving storage", async () => {
    render(<RecipeImageUploader recipeId={recipeId} images={[]} onChanged={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Файл"), {
      target: { files: [new File(["<svg />"], "unsafe.svg", { type: "image/svg+xml" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Завантажити зображення" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Дозволено JPEG, PNG або WebP до 5 MiB"),
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("completes reservation, signed upload and server processing", async () => {
    const onChanged = vi.fn();
    const path = `recipes/${recipeId}/media/original.png`;
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
    render(<RecipeImageUploader recipeId={recipeId} images={[]} onChanged={onChanged} />);
    const file = new File(["png"], "borsch.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText("Файл"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Завантажити зображення" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
    expect(mocks.uploadToSignedUrl).toHaveBeenCalledWith(path, "signed-token", file, {
      contentType: "image/png",
    });
    expect(mocks.post).toHaveBeenCalledTimes(2);
  });
});
