import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activePlaceCover,
  placeCoverViewFromMedia,
} from "../lib/places/cover";

describe("activePlaceCover / placeCoverViewFromMedia", () => {
  it("prefers isCover and builds a public catalog-media URL", () => {
    const media = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        storageBucket: "catalog-media",
        storagePath:
          "places/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cover/old.jpg",
        altTextEn: "Old",
        isCover: false,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        storageBucket: "catalog-media",
        storagePath:
          "places/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cover/cover.jpg",
        altTextEn: "Cafe terrace",
        altTextAr: "تراس",
        isCover: true,
      },
    ];
    const cover = activePlaceCover(media);
    assert.equal(cover?.id, "22222222-2222-4222-8222-222222222222");
    const view = placeCoverViewFromMedia(media, "https://example.supabase.co/");
    assert.equal(
      view?.url,
      "https://example.supabase.co/storage/v1/object/public/catalog-media/places/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cover/cover.jpg",
    );
    assert.equal(view?.altTextEn, "Cafe terrace");
    assert.equal(view?.altTextAr, "تراس");
  });

  it("returns null when there is no cover media", () => {
    assert.equal(
      placeCoverViewFromMedia([], "https://example.supabase.co"),
      null,
    );
  });

  it("uses the staff signed preview for a private cover", () => {
    const media = [{
      id: "22222222-2222-4222-8222-222222222222",
      storageBucket: "catalog-place-covers",
      storagePath: "places/private-cover.jpg",
      altTextEn: "Cafe terrace",
      isCover: true,
    }];
    const origin = "https://example.supabase.co";
    const signed = `${origin}/storage/v1/object/sign/catalog-place-covers/places/private-cover.jpg?token=test`;
    assert.equal(placeCoverViewFromMedia(media, origin, signed)?.url, signed);
    assert.equal(placeCoverViewFromMedia(media, origin)?.url, null);
  });
});
