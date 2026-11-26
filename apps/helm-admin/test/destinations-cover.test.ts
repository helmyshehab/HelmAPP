import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COVER_MAX_BYTES,
  activeDestinationCover,
  catalogMediaPublicUrl,
  coverViewFromMedia,
  validateAltTextAr,
  validateAltTextEn,
  validateCoverFile,
} from "../lib/destinations/cover";
import { canStartMutation } from "../lib/destinations/edit-save";

function fakeFile(input: {
  name?: string;
  type: string;
  size: number;
}): File {
  const bytes = new Uint8Array(1);
  if (typeof File === "function") {
    const file = new File([bytes], input.name ?? "cover.jpg", {
      type: input.type,
    });
    Object.defineProperty(file, "size", { value: input.size });
    return file;
  }
  const blob = new Blob([bytes], { type: input.type });
  Object.defineProperty(blob, "name", { value: input.name ?? "cover.jpg" });
  Object.defineProperty(blob, "size", { value: input.size });
  return blob as unknown as File;
}

describe("activeDestinationCover / coverViewFromMedia", () => {
  it("selects isCover media and resolves public catalog-media URL", () => {
    const media = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        storageBucket: "catalog-media",
        storagePath:
          "destinations/df027529-5744-4486-a36d-56d2a2170a0c/cover/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg",
        altTextEn: "Ubud",
        altTextAr: "أبود",
        isCover: true,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        storageBucket: "catalog-media",
        storagePath: "destinations/x/cover/other.jpg",
        isCover: false,
      },
    ];
    const cover = activeDestinationCover(media);
    assert.equal(cover?.id, "11111111-1111-4111-8111-111111111111");

    const view = coverViewFromMedia(media, "https://example.supabase.co/");
    assert.deepEqual(view, {
      url: "https://example.supabase.co/storage/v1/object/public/catalog-media/destinations/df027529-5744-4486-a36d-56d2a2170a0c/cover/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.jpg",
      altTextEn: "Ubud",
      altTextAr: "أبود",
      mediaId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("returns null when no cover exists", () => {
    assert.equal(activeDestinationCover([]), null);
    assert.equal(coverViewFromMedia([], "https://example.supabase.co"), null);
  });
});

describe("catalogMediaPublicUrl", () => {
  it("rejects non catalog-media buckets and path traversal", () => {
    assert.equal(
      catalogMediaPublicUrl(
        "https://example.supabase.co",
        "private",
        "destinations/a/cover/b.jpg",
      ),
      null,
    );
    assert.equal(
      catalogMediaPublicUrl(
        "https://example.supabase.co",
        "catalog-media",
        "../escape.jpg",
      ),
      null,
    );
  });
});

describe("cover client validation", () => {
  it("requires EN alt text and caps length", () => {
    assert.match(validateAltTextEn("  ") ?? "", /required/i);
    assert.equal(validateAltTextEn("Rice terraces"), null);
    assert.match(validateAltTextEn("x".repeat(501)) ?? "", /500/);
    assert.equal(validateAltTextAr(""), null);
    assert.match(validateAltTextAr("ي".repeat(501)) ?? "", /500/);
  });

  it("validates file type and size", () => {
    assert.match(validateCoverFile(null) ?? "", /choose/i);
    assert.match(
      validateCoverFile(
        fakeFile({ type: "image/gif", size: 100 }),
      ) ?? "",
      /jpeg|png|webp/i,
    );
    assert.match(
      validateCoverFile(
        fakeFile({ type: "image/jpeg", size: COVER_MAX_BYTES + 1 }),
      ) ?? "",
      /5 MiB/i,
    );
    assert.equal(
      validateCoverFile(fakeFile({ type: "image/png", size: 2048 })),
      null,
    );
    assert.equal(
      validateCoverFile(fakeFile({ type: "image/webp", size: 2048 })),
      null,
    );
  });
});

describe("cover mutation guard", () => {
  it("prevents duplicate submissions while in flight", () => {
    assert.equal(canStartMutation(false), true);
    assert.equal(canStartMutation(true), false);
  });
});

describe("cover view failure / replace safety helpers", () => {
  it("keeps alt text when public URL cannot be resolved", () => {
    const view = coverViewFromMedia(
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          storageBucket: "other-bucket",
          storagePath: "destinations/a/cover/b.jpg",
          altTextEn: "Keep me",
          altTextAr: "اتركني",
          isCover: true,
        },
      ],
      "https://example.supabase.co",
    );
    assert.equal(view?.url, null);
    assert.equal(view?.altTextEn, "Keep me");
    assert.equal(view?.altTextAr, "اتركني");
  });
});
