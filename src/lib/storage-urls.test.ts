import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        getPublicUrl: vi.fn((path: string) => ({
          data: {
            publicUrl: `https://example.supabase.co/storage/v1/object/public/covers/${path}`,
          },
        })),
      })),
    },
  },
}));

import { getLessonThumbnailOptimizedUrl } from "@/lib/storage-urls";

describe("getLessonThumbnailOptimizedUrl", () => {
  // A transformação de imagem do Supabase (/render/image) é um recurso pago e
  // não está habilitada neste projeto, então servimos a URL pública crua.
  it("serves the raw public URL (with single cache buster) for sidebar thumbnails", () => {
    const url = getLessonThumbnailOptimizedUrl(
      "tenant/demo/lessons/lesson-1/thumbnail.jpg?t=1710000000",
      "lesson-thumb",
    );

    expect(url).toBe(
      "https://example.supabase.co/storage/v1/object/public/covers/tenant/demo/lessons/lesson-1/thumbnail.jpg?t=1710000000",
    );
    expect(url).not.toContain("/render/image/");
    expect(url).not.toContain("resize=");
  });

  it("serves the raw public URL for lesson cards", () => {
    const url = getLessonThumbnailOptimizedUrl(
      "tenant/demo/lessons/lesson-1/thumbnail.jpg",
      "lesson-card",
    );

    expect(url).toBe(
      "https://example.supabase.co/storage/v1/object/public/covers/tenant/demo/lessons/lesson-1/thumbnail.jpg",
    );
    expect(url).not.toContain("/render/image/");
    expect(url).not.toContain("resize=");
  });
});
