import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activePackageCover,
  packageCoverViewFromMedia,
} from "../lib/packages/cover";

describe("activePackageCover / packageCoverViewFromMedia", () => {
  it("prefers isCover and builds a staff signed preview URL", () => {
    const media = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        storageBucket: "catalog-media",
        storagePath: "packages/pkg/cover/old.jpg",
        altTextEn: "Old",
        isCover: false,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        storageBucket: "catalog-package-covers",
        storagePath: "packages/pkg/cover/cover.jpg",
        altTextEn: "Rice terraces",
        altTextAr: "مزارع",
        isCover: true,
      },
    ];
    const cover = activePackageCover(media);
    assert.equal(cover?.id, "22222222-2222-4222-8222-222222222222");
    const origin = "https://example.supabase.co";
    const signed = `${origin}/storage/v1/object/sign/catalog-package-covers/packages/pkg/cover/cover.jpg?token=test`;
    const view = packageCoverViewFromMedia(media, origin, signed);
    assert.equal(view?.url, signed);
    assert.equal(view?.altTextEn, "Rice terraces");
    assert.equal(view?.altTextAr, "مزارع");
  });

  it("returns null when there is no cover media", () => {
    assert.equal(
      packageCoverViewFromMedia([], "https://example.supabase.co"),
      null,
    );
  });
});