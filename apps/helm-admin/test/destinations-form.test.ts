import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyDestinationForm,
  validateCreateForm,
  validateUpdateForm,
  valuesFromDestination,
} from "../lib/destinations/form-schema";

describe("destination form validation", () => {
  it("requires identity fields on create", () => {
    const result = validateCreateForm(emptyDestinationForm());
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.errors.slug);
    assert.ok(result.errors.nameEn);
    assert.ok(result.errors.nameAr);
    assert.ok(result.errors.countryCode);
  });

  it("builds a create body with optional geo/parent/tags", () => {
    const values = {
      ...emptyDestinationForm(),
      slug: "bali",
      nameEn: "Bali",
      nameAr: "بالي",
      countryCode: "id",
      cityId: "11111111-1111-1111-1111-111111111111",
      parentId: "22222222-2222-2222-2222-222222222222",
      websiteUrl: "https://example.com",
      tagSlugs: ["beach", "beach", "family"],
      isFeatured: true,
    };
    const result = validateCreateForm(values);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.body.countryCode, "ID");
    assert.equal(result.body.cityId, values.cityId);
    assert.equal(result.body.parentId, values.parentId);
    assert.deepEqual(result.body.tagSlugs, ["beach", "family"]);
    assert.equal(result.body.isFeatured, true);
    assert.equal(
      Object.prototype.hasOwnProperty.call(result.body, "lifecycleStatus"),
      false,
    );
  });

  it("rejects invalid slug and website", () => {
    const result = validateCreateForm({
      ...emptyDestinationForm(),
      slug: "Bali Island",
      nameEn: "Bali",
      nameAr: "بالي",
      countryCode: "ID",
      websiteUrl: "not-a-url",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.errors.slug);
    assert.ok(result.errors.websiteUrl);
  });

  it("omits slug from update when locked", () => {
    const values = valuesFromDestination({
      slug: "bali",
      nameEn: "Bali",
      nameAr: "بالي",
      countryCode: "ID",
      tags: [{ slug: "beach" }],
    });
    const withSlug = validateUpdateForm(values, { includeSlug: true });
    const withoutSlug = validateUpdateForm(values, { includeSlug: false });
    assert.equal(withSlug.ok, true);
    assert.equal(withoutSlug.ok, true);
    if (!withSlug.ok || !withoutSlug.ok) return;
    assert.equal(withSlug.body.slug, "bali");
    assert.equal(
      Object.prototype.hasOwnProperty.call(withoutSlug.body, "slug"),
      false,
    );
    assert.deepEqual(values.tagSlugs, ["beach"]);
  });
});
